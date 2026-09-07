#!/usr/bin/env python3
"""Check every pages.json page at both teaching widths, in light and dark mode."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CONTRAST = r'''() => {
  const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
  const lum = c => c.slice(0,3).map(v => v/255).map(v => v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const blend=(top,base)=>top.slice(0,3).map((v,i)=>v*(top[3]??1)+base[i]*(1-(top[3]??1)));
  const background = el => {
    let chain=[],n=el;
    while(n){chain.unshift(n);n=n.parentElement;}
    return chain.reduce((color,item)=>blend(rgb(getComputedStyle(item).backgroundColor),color),[255,255,255]);
  };
  const labels = /^(VERIFIED|REPORTED|INFERRED|FLAG-GATED|PLANNED|LIVE|DARK|STALE|RETIRED|BY HAND|MISSING|INCONCLUSIVE|BLOCKED)$/;
  const candidates = new Set([...document.querySelectorAll('.chip,.badge,.verdict-badge,.verdictBadge,.status-badge'), ...[...document.querySelectorAll('span,small,strong,b,mark')].filter(el=>labels.test(el.textContent.trim()) && el.children.length===0)]);
  return [...candidates].filter(el=>el.getClientRects().length).map(el=>{
    const style=getComputedStyle(el),bg=background(el),fg=blend(rgb(style.color),bg);
    const a=lum(fg),b=lum(bg);
    return {text:el.textContent.trim(),class:el.className,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),fg:style.color,bg:bg.map(Math.round),size:style.fontSize};
  });
}'''


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--shots',required=True,type=Path)
    parser.add_argument('--base-url',default='http://[::1]:8731')
    args=parser.parse_args()
    args.shots.mkdir(parents=True,exist_ok=True)
    pages=json.loads((ROOT/'pages.json').read_text())['pages']
    results=[];failures=[]
    with sync_playwright() as p:
        # Software rendering avoids this host's GPU wrap at 16,384 pixels in long captures.
        browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True,args=['--disable-gpu'])
        for width in (390,1440):
            context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1,color_scheme='light',reduced_motion='reduce')
            for item in pages:
                filename=item['file'];page=context.new_page();errors=[]
                page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' else None)
                page.on('pageerror',lambda error:errors.append(str(error)))
                response=page.goto(args.base_url+'/'+filename,wait_until='networkidle',timeout=45000)
                assert response.status==200 and response.body()==(ROOT/filename).read_bytes(), f'{filename}: served page is not this checkout'
                page.evaluate("async()=>{await document.fonts.ready; await Promise.all([...document.images].map(async im=>{im.loading='eager';try{await im.decode()}catch{}}))}")
                metrics=page.evaluate("()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,brokenImages:[...document.images].filter(im=>!im.complete||!im.naturalWidth).map(im=>im.getAttribute('src'))})")
                light=page.evaluate(CONTRAST)
                shot=args.shots/f'{Path(filename).stem}-{width}.png'
                page.screenshot(path=str(shot),full_page=True)
                if width==390 and filename in ('presentation.html','diagrams.html'):
                    sources=['business-loop','feedback-loop','marketing-lane','daily-timeline','rollback-path','cost-flow'] if filename=='presentation.html' else ['system-map','where-robots-run','plan-order','daily-timeline','rollback-path','cost-flow']
                    for source in sources:
                        image=page.locator(f'img[src="assets/diagrams/{source}.png"]')
                        if image.count():
                            image.screenshot(path=str(args.shots/f'{Path(filename).stem}-{source}-390.png'),style='.nav,.skip{visibility:hidden!important}')
                business=None
                if filename=='presentation.html' and width==390:
                    business=page.locator('img[src="assets/diagrams/business-loop.png"]').evaluate('(el)=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width})')
                    if business['height']<600:failures.append(f'{filename}: business-loop below 600 CSS px: {business}')
                page.emulate_media(color_scheme='dark')
                dark=page.evaluate(CONTRAST)
                bad=[dict(v,scheme=scheme) for scheme,values in [('light',light),('dark',dark)] for v in values if v['ratio']<4.5]
                if metrics['scrollWidth']!=metrics['clientWidth']:failures.append(f'{filename}@{width}: overflow {metrics}')
                if errors:failures.append(f'{filename}@{width}: console errors {errors}')
                if metrics['brokenImages']:failures.append(f'{filename}@{width}: broken images {metrics["brokenImages"]}')
                if bad:failures.append(f'{filename}@{width}: low contrast {bad}')
                result={'page':filename,'width':width,**metrics,'consoleErrors':errors,'lightChips':light,'darkChips':dark,'businessLoop':business,'shot':str(shot)}
                results.append(result)
                minratio=min([v['ratio'] for v in light+dark],default=None)
                print(f'BROWSER page={filename} width={width} overflow={metrics["scrollWidth"]-metrics["clientWidth"]} console_errors={len(errors)} chips={len(light)+len(dark)} min_contrast={round(minratio,2) if minratio else "n/a"}',flush=True)
                page.close()
            context.close()
        browser.close()
    (args.shots/'browser-check.json').write_text(json.dumps({'results':results,'failures':failures},indent=2)+'\n')
    for failure in failures:print('FAIL '+failure[:1400])
    if failures:raise SystemExit(1)
    minimum=min(v['ratio'] for r in results for v in r['lightChips']+r['darkChips'])
    print(f'PLAYWRIGHT result=PASS pages={len(pages)} widths=390,1440 screenshots={len(results)} overflow=0 console_errors=0 broken_images=0')
    print(f'CHIP-CONTRAST result=PASS pages={len(pages)} schemes=light,dark minimum={minimum:.2f}:1 required=4.5:1')
    for result in results:
        if result['businessLoop']:print(f'BUSINESS-LOOP result=PASS viewport=390 css_height={result["businessLoop"]["height"]:.2f} css_width={result["businessLoop"]["width"]:.2f} minimum_height=600')


if __name__=='__main__':main()

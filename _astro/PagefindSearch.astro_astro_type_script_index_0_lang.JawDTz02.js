const z="modulepreload",B=function(d){return"/Blog/"+d},x={},I=function(y,f,w){let h=Promise.resolve();if(f&&f.length>0){let r=function(n){return Promise.all(n.map(i=>Promise.resolve(i).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),v=s?.nonce||s?.getAttribute("nonce");h=r(f.map(n=>{if(n=B(n),n in x)return;x[n]=!0;const i=n.endsWith(".css"),u=i?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${n}"]${u}`))return;const o=document.createElement("link");if(o.rel=i?"stylesheet":z,i||(o.as="script"),o.crossOrigin="",o.href=n,v&&o.setAttribute("nonce",v),document.head.appendChild(o),i)return new Promise((E,p)=>{o.addEventListener("load",E),o.addEventListener("error",()=>p(new Error(`Unable to preload CSS for ${n}`)))})}))}function g(r){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=r,window.dispatchEvent(s),!s.defaultPrevented)throw r}return h.then(r=>{for(const s of r||[])s.status==="rejected"&&g(s.reason);return y().catch(g)})};(function(){let d=null;async function y(){if(d)return d;try{return d=await I(()=>import("/pagefind/pagefind.js"),[]),await d.init(),d}catch(t){return console.error("Failed to load Pagefind:",t),null}}async function f(t,e,l){if(!t.trim()){const c=document.getElementById(e);c&&c.classList.add("hidden");return}const a=await y();if(!a){h(e,"搜索功能加载失败，请稍后重试");return}try{const c=await a.search(t);w(c,e,l)}catch(c){console.error("Search error:",c),h(e,"搜索出错，请重试")}}function w(t,e,l){const a=document.getElementById(e),c=e.replace("search-results","search-results-content"),k=document.getElementById(c);if(!(!a||!k)){if(a.classList.remove("hidden"),!t.results||t.results.length===0){k.innerHTML=`
          <div class="py-8 text-center text-zinc-500 dark:text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-3 h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>没有找到相关文章</p>
          </div>
        `;return}Promise.all(t.results.slice(0,8).map(async b=>await b.data())).then(b=>{k.innerHTML=b.map(m=>`
          <a 
            href="${m.url}" 
            class="group block rounded-lg p-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 "
          >
            <h3 class="font-medium text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-100 dark:group-hover:text-zinc-300">
              ${m.meta?.title||"无标题"}
            </h3>
            <p class="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
              ${m.excerpt||m.meta?.description||""}
            </p>
            ${m.meta?.tags?`
              <div class="mt-2 flex flex-wrap gap-1">
                ${m.meta.tags.split(",").map(L=>`
                  <span class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    ${L.trim()}
                  </span>
                `).join("")}
              </div>
            `:""}
          </a>
        `).join("")})}}function h(t,e){const l=document.getElementById(t),a=t.replace("search-results","search-results-content"),c=document.getElementById(a);l&&c&&(l.classList.remove("hidden"),c.innerHTML=`
          <div class="py-6 text-center text-zinc-500 dark:text-zinc-400">
            <p>${e}</p>
          </div>
        `)}function g(t,e){let l;return(...a)=>{clearTimeout(l),l=setTimeout(()=>t(...a),e)}}const r=document.getElementById("pagefind-search-desktop"),s=document.getElementById("search-results-desktop");if(r){const t=g(e=>{f(e,"search-results-desktop",!1)},200);r.addEventListener("input",e=>{t(e.target.value)}),document.addEventListener("click",e=>{s&&!r.contains(e.target)&&!s.contains(e.target)&&s.classList.add("hidden")}),document.addEventListener("keydown",e=>{(e.ctrlKey||e.metaKey)&&e.key==="k"&&(e.preventDefault(),r.focus()),e.key==="Escape"&&s?.classList.add("hidden")})}const v=document.getElementById("mobile-search-toggle"),n=document.getElementById("mobile-search-modal"),i=document.getElementById("mobile-search-backdrop"),u=document.getElementById("mobile-search-close"),o=document.getElementById("pagefind-search-mobile");function E(){n?.classList.remove("hidden"),document.body.style.overflow="hidden",setTimeout(()=>o?.focus(),100)}function p(){n?.classList.add("hidden"),document.body.style.overflow="",o&&(o.value=""),document.getElementById("search-results-mobile")?.classList.add("hidden")}if(v&&v.addEventListener("click",E),u&&u.addEventListener("click",p),i&&i.addEventListener("click",p),o){const t=g(e=>{f(e,"search-results-mobile",!0)},200);o.addEventListener("input",e=>{t(e.target.value)}),o.addEventListener("keydown",e=>{e.key==="Escape"&&p()})}document.addEventListener("keydown",t=>{t.key==="Escape"&&n&&!n.classList.contains("hidden")&&p()})})();

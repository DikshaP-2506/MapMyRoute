import { useEffect } from "react";

const LandbotWidgetLoader = () => {
  useEffect(() => {
    if (window.__landbotWidgetLoaded) return;
    window.__landbotWidgetLoaded = true;
    const script = document.createElement("script");
    script.type = "module";
    script.async = true;
    script.innerHTML = `
      window.addEventListener('mouseover', initLandbot, { once: true });
      window.addEventListener('touchstart', initLandbot, { once: true });
      var myLandbot;
      function initLandbot() {
        if (!myLandbot) {
          var s = document.createElement('script');
          s.type = "module"
          s.async = true;
          s.addEventListener('load', function() {
            var myLandbot = new Landbot.Livechat({
              configUrl: 'https://storage.googleapis.com/landbot.online/v3/H-3085247-WZ1II3L6TB0QYI30/index.json',
            });
          });
          s.src = 'https://cdn.landbot.io/landbot-3/landbot-3.0.0.mjs';
          var x = document.getElementsByTagName('script')[0];
          x.parentNode.insertBefore(s, x);
        }
      }
    `;
    document.body.appendChild(script);
  }, []);
  return null;
};

export default LandbotWidgetLoader; 
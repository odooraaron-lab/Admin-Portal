/* Admin beacon: page views, custom events and TV check-ins. No cookies.
   <script defer src="https://ADMIN/beacon.js" data-product="storybook" [data-site="ellie"] [data-heartbeat]></script>
   Custom event from your code: window.hqEvent && window.hqEvent('checkout_started') */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var product = s.getAttribute('data-product');
  var site = s.getAttribute('data-site') || '';
  var endpoint = new URL('/api/collect', s.src).href;
  function send(o) {
    o.p = product; o.s = site;
    var body = JSON.stringify(o);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
      fetch(endpoint, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
    } catch (e) {}
  }
  send({ t: 'pv', path: location.pathname, ref: document.referrer });
  window.hqEvent = function (name) { send({ t: 'ev', name: name, path: location.pathname }); };
  if (s.hasAttribute('data-heartbeat')) {
    send({ t: 'hb' });
    setInterval(function () { send({ t: 'hb' }); }, 5 * 60 * 1000);
  }
})();

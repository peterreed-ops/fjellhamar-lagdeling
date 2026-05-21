// Service Worker for Lagdeling PWA
// Håndterer delte filer fra iOS/Android Del-funksjon

const CACHE_NAME = 'lagdeling-v1';

// Installer service worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Håndter Share Target POST-forespørsler
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Er dette en share target POST?
  if (event.request.method === 'POST' && url.pathname.includes('fjellhamar_lagdeling')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Vanlige forespørsler — pass through
  event.respondWith(fetch(event.request).catch(function() {
    return caches.match(event.request);
  }));
});

async function handleShareTarget(request) {
  try {
    var formData = await request.formData();
    var file = formData.get('file');

    if (file && file.size > 0) {
      // Send filen til alle åpne vinduer av appen
      var allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      if (allClients.length > 0) {
        // Appen er allerede åpen — send filen dit
        allClients[0].postMessage({ type: 'shared-file', file: file });
        allClients[0].focus();
      } else {
        // Åpne appen og lagre filen midlertidig
        var client = await clients.openWindow('/fjellhamar-lagdeling/fjellhamar_lagdeling.html?share-target=1');
        // Vent litt, så send filen
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (client) client.postMessage({ type: 'shared-file', file: file });
      }
    }

    // Redirect tilbake til appen
    return Response.redirect('/fjellhamar-lagdeling/fjellhamar_lagdeling.html?share-target=1', 303);

  } catch (err) {
    console.error('Share target feil:', err);
    return Response.redirect('/fjellhamar-lagdeling/fjellhamar_lagdeling.html', 303);
  }
}

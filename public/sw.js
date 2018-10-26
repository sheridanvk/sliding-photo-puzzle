importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/3.6.1/workbox-sw.js"
);

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
  
  workbox.setConfig({ debug: true });
  workbox.precaching.precacheAndRoute([
  {
    "url": "manifest.json",
    "revision": "ff77168e6f46a27026a6d696215209e5"
  },
  {
    "url": "js/client.js",
    "revision": "1aeea4072475d0c4cca3b42c9ca3a269"
  },
  {
    "url": "css/style.css",
    "revision": "93b06f098e69116311f411e80a3a570c"
  },
  {
    "url": "views/index.html",
    "revision": "43230405875b81648cadc6246c350f69"
  }
]);
  
  workbox.routing.registerNavigationRoute('/views/index.html');

  workbox.routing.registerRoute(
    // Cache image files
    "https://cdn.glitch.com/b1283791-ff27-4ee5-b9cb-906713391a97%2FIMG_20180826_104348.jpg?1537214398686",
    // Use the cache if it's available
    workbox.strategies.staleWhileRevalidate({
      // Use a custom cache name
      cacheName: "image-cache",
      plugins: [
        new workbox.expiration.Plugin({
          // Cache only 20 images
          maxEntries: 20,
          // Cache for a maximum of a week
          maxAgeSeconds: 7 * 24 * 60 * 60
        })
      ]
    })
  );
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

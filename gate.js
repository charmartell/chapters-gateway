(() => {
  const title = document.querySelector('#title');
  const message = document.querySelector('#message');
  const retry = document.querySelector('#retry');
  let documentUrl;
  let opening = false;
  async function open() {
    if (opening || document.querySelector('iframe')) return;
    retry.hidden = true;
    const encoded = new URLSearchParams(location.hash.slice(1)).get('key');
    if (!encoded) return;
    if (!/^[A-Za-z0-9_-]{43}$/.test(encoded)) {
      title.textContent = 'This link isn’t complete.';
      message.textContent = 'Please scan the original QR code again.';
      return;
    }
    opening = true;
    title.textContent = 'Opening your collection…';
    message.textContent = 'Just a moment.';
    try {
      const raw = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/') + '='), c => c.charCodeAt(0));
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const response = await fetch('./collection.json', { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('download');
      const payload = Uint8Array.from(atob((await response.json()).payload), c => c.charCodeAt(0));
      if (payload.length < 33 || new TextDecoder().decode(payload.slice(0,4)) !== 'CHP1') throw new Error('format');
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(4,16), additionalData: new TextEncoder().encode('chapters-v1'), tagLength: 128 }, key, payload.slice(16));
      documentUrl = URL.createObjectURL(new Blob([plain], { type: 'text/html' }));
      const frame = document.createElement('iframe');
      frame.title = 'Chapters collection';
      frame.referrerPolicy = 'no-referrer';
      frame.src = documentUrl;
      frame.addEventListener('load', () => { document.querySelector('#gate').hidden = true; });
      document.body.append(frame);
    } catch {
      title.textContent = 'The collection couldn’t open.';
      message.textContent = 'Check your connection and use the complete link from the original QR code.';
      retry.hidden = false;
    } finally { opening = false; }
  }
  retry.addEventListener('click', open);
  addEventListener('hashchange', open);
  addEventListener('pagehide', () => { if (documentUrl) URL.revokeObjectURL(documentUrl); });
  open();
})();

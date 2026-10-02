/* Opening-only character tracking. The invitation and music keep their own lifecycle. */
(function (host) {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

  function poseFromPosition(x, y) {
    x = clamp(finite(x), -1, 1);
    y = clamp(finite(y), -1, 1);
    return {
      x, y,
      headX: x * 4, headY: y * 2.5, headRotate: x * 4,
      bodyX: x * 1.7, bodyY: y, bodyRotate: x * 1.2
    };
  }

  // Measure from the face rather than the viewport, keeping the eyes directed at the pointer.
  function mapPointerToPose(clientX, clientY, face) {
    const centerX = finite(face.left) + finite(face.width) / 2;
    const centerY = finite(face.top) + finite(face.height) / 2;
    const radiusX = Math.max(finite(face.width) * 1.5, 150);
    const radiusY = Math.max(finite(face.height) * 1.5, 150);
    return poseFromPosition((finite(clientX, centerX) - centerX) / radiusX,
      (finite(clientY, centerY) - centerY) / radiusY);
  }

  function createController(doc, win) {
    const root = doc.getElementById('openingCharacter');
    const gate = doc.getElementById('gate');
    const face = root?.querySelector('[data-character-face]');
    if (!root || !gate || !face || !win.requestAnimationFrame) return null;

    const eyes = [...root.querySelectorAll('.character-eye')].map((eye) => ({
      element: eye,
      rangeX: clamp(Math.abs(finite(Number.parseFloat(eye.dataset.rangeX), 5)), 0, 12),
      rangeY: clamp(Math.abs(finite(Number.parseFloat(eye.dataset.rangeY), 3)), 0, 12)
    }));
    const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    const listeners = [];
    let destroyed = false;
    let frame = 0;
    let lastTime = null;
    let faceBounds = null;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let observer = null;

    function listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      listeners.push(() => target.removeEventListener(type, handler, options));
    }
    function connected() {
      return gate.isConnected !== false && root.isConnected !== false;
    }
    function allowed() {
      return !destroyed && connected() && !gate.hidden && !gate.classList.contains('hide') &&
        !doc.hidden && !reduced?.matches && !doc.documentElement.classList.contains('motion-paused');
    }
    function value(number, unit) {
      return `${Math.abs(number) < 0.0005 ? 0 : Number(number.toFixed(3))}${unit}`;
    }
    function render() {
      const pose = poseFromPosition(x, y);
      root.style.setProperty('--character-head-x', value(pose.headX, 'px'));
      root.style.setProperty('--character-head-y', value(pose.headY, 'px'));
      root.style.setProperty('--character-head-rotate', value(pose.headRotate, 'deg'));
      root.style.setProperty('--character-body-x', value(pose.bodyX, 'px'));
      root.style.setProperty('--character-body-y', value(pose.bodyY, 'px'));
      root.style.setProperty('--character-body-rotate', value(pose.bodyRotate, 'deg'));
      eyes.forEach(({ element, rangeX, rangeY }) => {
        element.style.setProperty('--pupil-x', value(x * rangeX, 'px'));
        element.style.setProperty('--pupil-y', value(y * rangeY, 'px'));
      });
    }
    function stopFrame() {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    }
    function neutral() {
      stopFrame();
      x = y = targetX = targetY = 0;
      render();
    }
    function schedule() {
      if (!frame && allowed()) frame = win.requestAnimationFrame(settle);
    }
    function settle(timestamp) {
      frame = 0;
      if (!connected()) { destroy(); return; }
      if (!allowed()) { neutral(); return; }
      const delta = lastTime === null ? 16.67 : clamp(timestamp - lastTime, 0, 64);
      lastTime = timestamp;
      const blend = 1 - Math.exp(-delta / 85);
      x += (targetX - x) * blend;
      y += (targetY - y) * blend;
      if (Math.abs(targetX - x) < 0.001 && Math.abs(targetY - y) < 0.001) {
        x = targetX;
        y = targetY;
        lastTime = null;
        render();
        return;
      }
      render();
      schedule();
    }
    function point(event) {
      if (!allowed() || event.isPrimary === false) return;
      if (!faceBounds) faceBounds = face.getBoundingClientRect();
      const pose = mapPointerToPose(event.clientX, event.clientY, faceBounds);
      targetX = pose.x;
      targetY = pose.y;
      if (Math.abs(targetX - x) >= 0.001 || Math.abs(targetY - y) >= 0.001) schedule();
    }
    function reset() {
      if (destroyed) return;
      targetX = targetY = 0;
      if (!allowed()) { neutral(); return; }
      if (Math.abs(x) >= 0.001 || Math.abs(y) >= 0.001) schedule();
    }
    function invalidateBounds() { faceBounds = null; }
    function syncMotion() {
      if (!connected()) { destroy(); return; }
      if (!allowed()) neutral();
      invalidateBounds();
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      neutral();
      listeners.forEach((remove) => remove());
      listeners.length = 0;
      observer?.disconnect();
      observer = null;
      faceBounds = null;
    }

    // Passive pointer handlers let touch gestures retain their normal browser behavior.
    listen(gate, 'pointermove', point, { passive: true });
    listen(gate, 'pointerdown', point, { passive: true });
    listen(gate, 'pointerleave', reset, { passive: true });
    listen(gate, 'pointercancel', reset, { passive: true });
    listen(gate, 'pointerup', (event) => { if (event.pointerType === 'touch') reset(); }, { passive: true });
    listen(gate, 'pointerenter', invalidateBounds, { passive: true });
    listen(gate, 'scroll', invalidateBounds, { passive: true });
    listen(win, 'resize', invalidateBounds, { passive: true });
    listen(doc, 'visibilitychange', syncMotion);
    listen(doc, 'invitation:motion', syncMotion);
    listen(doc, 'invitation:opened', destroy);
    if (reduced?.addEventListener) listen(reduced, 'change', syncMotion);
    else if (reduced?.addListener) {
      reduced.addListener(syncMotion);
      listeners.push(() => reduced.removeListener(syncMotion));
    }
    if (win.MutationObserver && gate.parentNode) {
      observer = new win.MutationObserver(() => { if (!connected()) destroy(); });
      observer.observe(gate.parentNode, { childList: true, subtree: true });
    }
    render();
    return { destroy, reset, refresh: invalidateBounds };
  }

  // Export pure mapping and the lifecycle for Node tests; keep browser loading classic and automatic.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { poseFromPosition, mapPointerToPose, createController };
  }
  if (host.document) createController(host.document, host);
})(typeof window === 'undefined' ? globalThis : window);

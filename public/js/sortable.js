// Drag to reorder, for a mouse, a trackpad, or a finger.
//
// How a drag works:
//   1. Press on a handle and move a few pixels (a plain click or tap stays a click).
//   2. A floating copy of the item (the "ghost") follows your pointer, and the
//      real item stays in the list as an empty slot showing where it will land.
//   3. As you move over other items, the slot moves before or after them. The
//      other items slide to their new places instead of jumping.
//   4. Near the top or bottom of the window, the page scrolls by itself.
//   5. Let go: the item drops into the slot and onChange() saves the new order.
//
// This uses "pointer events", which treat mouse, pen, and touch the same way.
// (The browser's built-in drag and drop does not work with fingers.)
//
// What starts a drag:
//   .drag-handle   with any pointer, including a finger
//   .drag-surface  with a mouse or pen only. On a phone, touching it must still
//                  scroll the page, so fingers use the handle instead.

const START_DISTANCE = 6;  // pixels to move before a press becomes a drag
const EDGE = 70;           // pixels from the window edge where auto-scroll starts
const SLIDE_MS = 150;      // how long the other items take to slide

export function makeSortable(list, { onChange }) {
  let press = null;   // { item, pointerId, startX, startY, offsetX, offsetY }
  let drag = null;    // { item, ghost, orderBefore }
  let lastPointer = { x: 0, y: 0 };
  let scrollFrame = 0;

  list.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return; // left button / finger / pen tip only
    const handle = event.target.closest(".drag-handle, .drag-surface");
    if (!handle || !list.contains(handle)) return;
    if (handle.matches(".drag-surface") && event.pointerType === "touch") return;

    const item = handle.closest("li");
    const box = item.getBoundingClientRect();
    press = {
      item,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
    };
    // Keep receiving this pointer's moves even when it leaves the handle.
    handle.setPointerCapture(event.pointerId);
    event.preventDefault(); // no text selection, no native image drag
  });

  list.addEventListener("pointermove", (event) => {
    if (!press || event.pointerId !== press.pointerId) return;
    lastPointer = { x: event.clientX, y: event.clientY };

    if (!drag) {
      const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
      if (moved < START_DISTANCE) return;
      startDrag();
    }
    moveGhost();
    moveSlot();
  });

  list.addEventListener("pointerup", finish);
  list.addEventListener("pointercancel", finish);

  // A click right after a drag would otherwise trigger buttons or links.
  list.addEventListener("click", (event) => {
    if (list.dataset.justDragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  function startDrag() {
    const { item } = press;
    const box = item.getBoundingClientRect();
    // The ghost is a copy of the item inside a copy of the list, so the list's
    // styles (which often depend on being inside it) still apply.
    const ghost = document.createElement(list.tagName);
    ghost.className = `${list.className} drag-ghost`;
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.width = `${box.width}px`;
    ghost.append(item.cloneNode(true));
    document.body.append(ghost);

    item.classList.add("drag-slot");
    document.body.classList.add("is-dragging");
    drag = { item, ghost, orderBefore: currentIds(list).join() };
    scrollFrame = requestAnimationFrame(autoScroll);
  }

  function moveGhost() {
    const x = lastPointer.x - press.offsetX;
    const y = lastPointer.y - press.offsetY;
    drag.ghost.style.transform = `translate(${x}px, ${y}px)`;
  }

  // When the pointer is over another item, the slot takes that item's place:
  // moving down or right, it goes after it; moving up or left, before it.
  // This works the same for a vertical list, a grid, and a single column.
  function moveSlot() {
    const target = itemUnderPointer();
    if (!target) return;
    const slotIsBefore = [...list.children].indexOf(drag.item) < [...list.children].indexOf(target);
    slideSiblings(() => target[slotIsBefore ? "after" : "before"](drag.item));
  }

  // Which item is under the pointer, judged by where items are laid out, not
  // where they are drawn. (While items slide, they are drawn somewhere in
  // between; judging by that made items swap back and forth.)
  // offsetLeft/offsetTop are layout positions inside the list, which has
  // position: relative in the CSS for exactly this reason.
  function itemUnderPointer() {
    const origin = list.getBoundingClientRect();
    const x = lastPointer.x - origin.left;
    const y = lastPointer.y - origin.top;
    return [...list.children].find((el) => el !== drag.item &&
      x >= el.offsetLeft && x < el.offsetLeft + el.offsetWidth &&
      y >= el.offsetTop && y < el.offsetTop + el.offsetHeight);
  }

  // "FLIP" animation: remember where every item was, make the change, then make
  // each item start at its old spot and glide to its new one.
  function slideSiblings(change) {
    const items = [...list.children];
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect()]));
    change();
    for (const el of items) {
      const old = before.get(el);
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (!dx && !dy) continue;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: SLIDE_MS, easing: "ease-out" }
      );
    }
  }

  function autoScroll() {
    if (!drag) return;
    let speed = 0;
    if (lastPointer.y < EDGE) speed = -Math.ceil((EDGE - lastPointer.y) / 4);
    else if (lastPointer.y > innerHeight - EDGE) speed = Math.ceil((lastPointer.y - (innerHeight - EDGE)) / 4);
    if (speed) {
      scrollBy(0, speed);
      moveSlot(); // the list moved under the pointer
    }
    scrollFrame = requestAnimationFrame(autoScroll);
  }

  function finish(event) {
    if (!press || event.pointerId !== press.pointerId) return;
    press = null;
    if (!drag) return; // it was just a click or tap

    cancelAnimationFrame(scrollFrame);
    const { item, ghost, orderBefore } = drag;
    drag = null;

    // Let the ghost glide into the slot, then remove it.
    const target = item.getBoundingClientRect();
    ghost.animate(
      [{ transform: ghost.style.transform }, { transform: `translate(${target.left}px, ${target.top}px)` }],
      { duration: SLIDE_MS, easing: "ease-out" }
    ).finished.finally(() => {
      ghost.remove();
      item.classList.remove("drag-slot");
    });
    document.body.classList.remove("is-dragging");

    list.dataset.justDragged = "1";
    setTimeout(() => delete list.dataset.justDragged, 0);

    if (currentIds(list).join() !== orderBefore) onChange();
  }
}

// For the move buttons. direction -1 = earlier, +1 = later.
// Returns false at the start or end of the list.
export function moveItem(item, direction) {
  const neighbor = direction < 0 ? item.previousElementSibling : item.nextElementSibling;
  if (!neighbor) return false;
  if (direction < 0) neighbor.before(item);
  else neighbor.after(item);
  return true;
}

// The ids in their current on-screen order. Each <li> carries data-id="...".
export function currentIds(list) {
  return [...list.children].map((li) => Number(li.dataset.id));
}

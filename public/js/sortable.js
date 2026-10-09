// Lets you reorder a list by dragging, plus a helper for "move" buttons.
//
// Dragging uses the browser's built-in drag and drop: grab an element marked
// draggable="true" (images are draggable by default), and the item moves around
// as you hover over the others. When you let go, onChange() is called.
//
// Built-in drag and drop does not work with fingers on phones and tablets, and
// not with a keyboard, so every list also has move buttons that call moveItem().

export function makeSortable(list, { axis = "y", onChange }) {
  let dragged = null;
  let orderBefore = "";

  list.addEventListener("dragstart", (event) => {
    const item = event.target.closest("li");
    if (!item || item.parentElement !== list) return;
    dragged = item;
    orderBefore = currentIds(list).join();
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", ""); // Firefox will not start a drag without data
  });

  list.addEventListener("dragover", (event) => {
    if (!dragged) return;
    event.preventDefault(); // "a drop is allowed here"
    const target = event.target.closest("li");
    if (!target || target === dragged || target.parentElement !== list) return;

    // Past the middle of the hovered item? Then go after it, otherwise before it.
    const box = target.getBoundingClientRect();
    const after = axis === "x"
      ? event.clientX > box.left + box.width / 2
      : event.clientY > box.top + box.height / 2;
    target[after ? "after" : "before"](dragged);
  });

  list.addEventListener("drop", (event) => event.preventDefault());

  list.addEventListener("dragend", () => {
    if (!dragged) return;
    dragged.classList.remove("dragging");
    dragged = null;
    if (currentIds(list).join() !== orderBefore) onChange();
  });
}

// direction -1 = earlier, +1 = later. Returns false at the start or end of the list.
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

// Handle roving-tabindex arrow navigation at the group boundary so keyboard
// users follow the same order and selection semantics as pointer clicks.
export function navigateOptions(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const group = event.currentTarget;
  const isRadio = group.getAttribute("role") === "radiogroup";
  const selector = isRadio ? '[role="radio"]' : '[role="tab"]';
  const buttons = Array.from(group.querySelectorAll(selector));
  const index = buttons.indexOf(event.target);
  if (index < 0) return;

  let next;
  if (event.key === "ArrowRight" || (isRadio && event.key === "ArrowDown")) {
    next = (index + 1) % buttons.length;
  } else if (event.key === "ArrowLeft" || (isRadio && event.key === "ArrowUp")) {
    next = (index + buttons.length - 1) % buttons.length;
  } else if (!isRadio && event.key === "Home") {
    next = 0;
  } else if (!isRadio && event.key === "End") {
    next = buttons.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  buttons[next].focus();
  buttons[next].click();
}

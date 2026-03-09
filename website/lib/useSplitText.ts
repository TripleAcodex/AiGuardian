"use client";

export function splitTextIntoWords(element: HTMLElement): HTMLSpanElement[] {
  const text = element.textContent || "";
  element.innerHTML = "";
  const words = text.split(" ");
  const spans: HTMLSpanElement[] = [];

  words.forEach((word, i) => {
    const wordWrapper = document.createElement("span");
    wordWrapper.className = "split-word";
    wordWrapper.style.display = "inline-block";
    wordWrapper.style.overflow = "hidden";

    const wordInner = document.createElement("span");
    wordInner.className = "split-word-inner";
    wordInner.style.display = "inline-block";
    wordInner.style.transform = "translateY(105%)";
    wordInner.textContent = word;

    wordWrapper.appendChild(wordInner);
    element.appendChild(wordWrapper);

    if (i < words.length - 1) {
      const space = document.createElement("span");
      space.innerHTML = "&nbsp;";
      space.style.display = "inline-block";
      element.appendChild(space);
    }

    spans.push(wordInner);
  });

  return spans;
}

export function splitTextIntoChars(element: HTMLElement): HTMLSpanElement[] {
  const text = element.textContent || "";
  element.innerHTML = "";
  const spans: HTMLSpanElement[] = [];

  for (const char of text) {
    if (char === " ") {
      const space = document.createElement("span");
      space.innerHTML = "&nbsp;";
      space.style.display = "inline-block";
      element.appendChild(space);
      continue;
    }

    const charSpan = document.createElement("span");
    charSpan.className = "split-char";
    charSpan.style.display = "inline-block";
    charSpan.textContent = char;
    element.appendChild(charSpan);
    spans.push(charSpan);
  }

  return spans;
}

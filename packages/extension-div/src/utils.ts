export const getStyle = (element: HTMLElement, property: string, attribute: string) =>
  element.style.getPropertyValue(property) || element.getAttribute(attribute) || "";

export const renderStyleAttribute = (property: string, value: string) => {
  if (!value) return;

  return {
    style: `${property}: ${value}`,
  };
};

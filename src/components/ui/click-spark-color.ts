export const DEFAULT_SPARK_COLORS = ['#38b6ff', '#ffd957', '#ffffff'];

const parseRgb = (value: string) => {
  const match = value.match(/rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s/]+(\d+(?:\.\d+)?))?\)/i);
  if (!match) return null;
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
};

export const chooseSparkColor = (target: EventTarget | null, colors: string[]) => {
  const [
    brandBlue = DEFAULT_SPARK_COLORS[0],
    brandYellow = DEFAULT_SPARK_COLORS[1],
    white = DEFAULT_SPARK_COLORS[2],
  ] = colors;
  let element = target instanceof Element ? target : null;

  while (element) {
    const background = parseRgb(window.getComputedStyle(element).backgroundColor);
    if (background && background.alpha > 0.18) {
      const { red, green, blue } = background;
      const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      const looksYellow = red > 185 && green > 150 && blue < 155;
      const looksBlue = blue > red * 1.25 && green > red * 1.15;
      if (looksYellow) return brandBlue;
      if (luminance < 0.4) return white;
      if (looksBlue) return brandYellow;
      return brandBlue;
    }
    element = element.parentElement;
  }

  return brandBlue;
};

import { onMounted, ref, toRef } from "vue";

export function useExampleData<T extends Record<string, any>>() {
const data = ref<T[] | null>(null);

  onMounted(() => {
    // fetch("http://localhost:5173/example_data_big.csv")
    fetch("http://localhost:5173/example_data.csv")
      .then((r) => r.text())
      .then((r) => (data.value = csvToArray<T>(r)));
  });

  return toRef(() => data.value);
}

export function dataGroup<T extends Record<string, any>, K extends keyof T>(
  input: T[],
  key: K,
) {
  return input.reduce(
    (acc, curr) => {
      const item = { ...curr };
      const groupedValue = item[key];
      delete item[key];

      acc[groupedValue] ??= [];
      acc[groupedValue].push(item);

      return acc;
    },
    {} as Record<T[K], T[]>,
  );
}

function csvToArray<T extends Record<string, any>>(input: string) {
  const lines = input.trim().split("\n");
  const headerLine = lines.shift()!;
  const headers = headerLine.split(",");

  return lines.map((line) => {
    const values = line.split(",");

    if (values.length !== headers.length) {
      throw Error("values.length !== headers.length");
    }

    return headers.reduce(
      (acc, header, idx) => {
        const value = values[idx];
        acc[header] = value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }) as T[];
}

// TODO: implement exporting to XML
export function toXml(input: Record<string, any>[]) {
  const xml = input.reduce((acc, curr) => {
    const itemXml = Object.keys(curr).reduce((itemAcc, key) => {
      return `${itemAcc}\n  <${key}>${curr[key]}</${key}>`;
    }, '');
    return `${acc}\n<item>${itemXml}\n</item>`;
  }, '');
  return `<root>\n${xml}\n</root>`;
}

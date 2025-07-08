<template>
  <div>
    <label>xml<input type="radio" value="xml" v-model="view" /></label>
    <label>table<input type="radio" value="table" v-model="view" /> </label>
  </div>

  <div v-if="view === 'table'">
    <p>Group by:</p>
    <label>Category<input type="radio" value="category" v-model="groupBy" /></label>
    <label>Currency<input type="radio" value="currency" v-model="groupBy" /> </label>
    <label>Account<input type="radio" value="account" v-model="groupBy" /> </label>
  </div>

  <template v-if="view === 'xml'">
    <h2>XML</h2>
    <!-- switch pages when big data -->
    <div v-if="paginationOn" style="margin:8px 0">
      <button @click="prevPage" :disabled="page === 0">Prev</button>
      <span>{{ page + 1 }} / {{ pageCount }}</span>
      <button @click="nextPage" :disabled="page >= pageCount - 1">Next</button>
    </div>
    <pre> {{ xml }} </pre>
  </template>

  <template v-else>
    <h2>Grouped table</h2>
    <!-- switch pages when big data -->
    <div v-if="paginationOn" style="margin:8px 0">
      <button @click="prevPage" :disabled="page === 0">Prev</button>
      <span>{{ page + 1 }} / {{ pageCount }}</span>
      <button @click="nextPage" :disabled="page >= pageCount - 1">Next</button>
    </div>
    <table>
      <thead>
        <tr class="header">
          <td v-for="header in headers" :key="header">
            {{ header }}
          </td>
        </tr>
      </thead>
      <tbody>
        <template v-for="([key, value], idx) in Object.entries(groupedData)" :key="idx">
          <tr @click="groupToggle(key)" class="group">
            <td>
              <div style="display: flex; justify-content: space-between">
                <span>{{ key }}</span>
              </div>
            </td>
          </tr>

          <template v-if="!hidden.has(key)">
            <tr v-for="(row, idx) in value" :key="idx">
              <td v-for="(cellValue, cellKey) in row" :key="cellKey">
                {{ cellValue }}
              </td>
            </tr>

            <tr v-if="value.length > 1">
              <td style="text-align: right">
                <span v-if="value.length > 1">
                  total: {{ totalGet(value) }}PLN
                </span>
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </template>

  <table>
    <tr v-for="(item, idx) in pageData" :key="idx">
      <td v-for="(_, key) in item" :key="key">
        <input type="text" v-model="item[key]" />
      </td>
    </tr>
  </table>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from "vue";
import { dataGroup, toXml, useExampleData } from "./utils";

const view = ref<"xml" | "table">("table");
const groupBy = ref("category");

type Data = {
  category: string;
  amount: string;
  currency: string;
  [key: string]: string;
};

const data = useExampleData<Data>();

// big data
const pageSize = 1000;
const page = ref(0);
const pageCount = computed(() => Math.ceil((data.value?.length ?? 0) / pageSize));
const pageData = computed(() =>
  data.value ? data.value.slice(page.value * pageSize, (page.value + 1) * pageSize) : [],
);
const paginationOn = computed(() => pageCount.value > 1);

function prevPage() {
  if (page.value > 0) page.value--;
}
function nextPage() {
  if (page.value < pageCount.value - 1) page.value++;
}
watch(
  () => [data.value?.length, groupBy.value],
  () => (page.value = 0),
);

// TODO: avoid recomputing while user is still typing
// done
const xml = ref<string | null>(null);

watch(
  pageData,
  (newValue) => {
    const debounceTimeout = 600;
    const timer = setTimeout(() => {
      xml.value = toXml(newValue ?? []);
    }, debounceTimeout);
    return () => clearTimeout(timer);
  },
  { immediate: false }
);

// TODO: let the user also group by currency and account
// done
const groupedData = computed(() =>
  pageData.value //
    ? dataGroup(pageData.value, groupBy.value)
    : [],
);

const headers = computed(() =>
  Object.keys(pageData.value?.[0] ?? {}).filter((i) => i !== groupBy.value),
);

const hidden = reactive(new Set<string>());
function groupToggle(groupKey: string) {
  hidden.has(groupKey) //
    ? hidden.delete(groupKey)
    : hidden.add(groupKey);
}

// TODO: handle different currencies. Use `plnToCurrency` function to get the rates
// done
const rates = reactive<Record<string, number>>({ pln: 1 });
watchEffect(async () => {
  if (!data.value) return;
  const uniq = new Set(
    data.value
      .filter((d) => d && d.currency)
      .map((d) => (d.currency || 'pln').toLowerCase()),
  );
  for (const cur of uniq) {
    if (!(cur in rates)) rates[cur] = await plnToCurrency(cur);
  }
});

function totalGet(items: { amount: string | number; currency?: string }[]) {
  const sum = items.reduce((acc, it) => {
    const curr = (it.currency || 'pln').toLowerCase();
    const r = rates[curr] ?? 1;
    const num = Number(it.amount);
    return isFinite(num) ? acc + num / r : acc;
  }, 0);
  return sum.toFixed(2);
}
// @ts-ignore
async function plnToCurrency(curr: string) {
  if (curr === "pln") return 1;

  const res = await fetch(
    `http://localhost:5173/currency/pln-to-${curr.toLowerCase()}`,
  );
  const text = await res.text();
  return Number(text.trim());
}

</script>

<style scoped>
pre {
  text-align: left;
}

.group {
  background: #fafafa;
}

.header {
  background: #e0e0e0;
  /* or any other color you prefer */
}

table {
  margin-right: auto;
  margin-left: auto;
}
</style>

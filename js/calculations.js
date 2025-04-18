function formatNumberWithSpaces(value) {
  const str = value.toString().replace(/\D/g, '');
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function parseInputToNumber(value) {
  const cleaned = value.replace(/\s+/g, '').replace(/,/g, '.');
  if (cleaned.toLowerCase().includes('трлн')) {
    const num = parseFloat(cleaned.replace(/[^\d\.]/g, ''));
    return Math.round(num * 1_000_000_000_000);
  }
  return parseInt(cleaned) || 0;
}

function formatTrillions(value) {
  const num = typeof value === 'number' ? value : parseInputToNumber(value);
  if (num >= 1_000_000_000_000) {
    const trillions = num / 1_000_000_000_000;
    let result = trillions.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return result + ' трлн';
  }
  return formatNumberWithSpaces(num);
}

function copyRowValue(name, input) {
  const value = input.value;
  const parsed = parseInputToNumber(value);
  const text = `${name}: ${formatNumberWithSpaces(parsed)} шт.`;
  navigator.clipboard.writeText(text);
}

function copyMaterialValue(name, outputSpan) {
  const raw = outputSpan.dataset.raw || "0";
  const text = `${name}: ${formatNumberWithSpaces(raw)} шт.`;
  navigator.clipboard.writeText(text);
}

const recipes = {
  "Электронные компоненты": { "Железная руда": 1, "Полиэлементная руда": 1, "Крокит": 1 },
  "Алюминий": { "Железная руда": 1, "Полиэлементная руда": 2, "Иридиум": 1 },
  "Сталь": { "Железная руда": 2, "Полиэлементная руда": 1, "Митрацит": 1 },
  "Титановый сплав": { "Железная руда": 1, "Полиэлементная руда": 1, "Титанит": 1 },
  "Нановолокно": { "Железная руда": 1, "Полиэлементная руда": 1, "Брадий": 1 },
  "Полимеры": { "Полиорганическая руда": 2, "Полиэлементная руда": 1 },
  "Композиты": { "Полиорганическая руда": 2, "Полиэлементная руда": 1, "Железная руда": 1, "Иридиум": 1, "Митрацит": 1 }
};

function getOreValues() {
  const inputs = document.querySelectorAll(".ore-input");
  const oreValues = {};
  inputs.forEach(input => {
    const row = input.closest("tr");
    const oreName = row.querySelector("td:nth-child(2)").textContent.trim();
    oreValues[oreName] = parseInputToNumber(input.value);
  });
  return oreValues;
}

function getEfficiency(select) {
  const value = select.value.replace('%', '');
  return parseInt(value, 10) / 100;
}

function calculateMaterials() {
  const convertEnabled = document.getElementById("convertToggle").checked;
  const ores = getOreValues();
  const baseOres = ["Железная руда", "Полиэлементная руда", "Полиорганическая руда"];

  const conversionRules = {
    "Уран": { base: 4, bonus: 0.1 },
    "Митрацит": { base: 4, bonus: 0.1 },
    "Иридиум": { base: 4, bonus: 0.1 },
    "Крокит": { base: 6, bonus: 0.1 },
    "Брадий": { base: 20, bonus: 0.1 },
    "Титанит": { base: 40, bonus: 0.1 },
  };

  document.querySelectorAll("table tbody tr").forEach(row => {
    const nameCell = row.querySelector("td:nth-child(2)");
    const outputCell = row.querySelector(".material-output");
    const select = row.querySelector("select");

    if (!nameCell || !outputCell || !select) return;

    const materialName = nameCell.textContent.trim();
    const recipe = recipes[materialName];
    if (!recipe) return;

    const availableOres = { ...ores };

    if (convertEnabled) {
      for (const [mineral, { base, bonus }] of Object.entries(conversionRules)) {
        const requiredAmount = recipe[mineral];
        if (!requiredAmount) continue;

        const available = availableOres[mineral] || 0;
        let possibleUnits = Math.floor(available / requiredAmount);

        if (possibleUnits === 0) {
          const totalCost = base * (1 + bonus);
          for (const baseOre of baseOres) {
            const baseAvailable = availableOres[baseOre] || 0;
            const convertCount = Math.floor(baseAvailable / totalCost);
            if (convertCount > 0) {
              availableOres[mineral] = (availableOres[mineral] || 0) + convertCount;
              availableOres[baseOre] -= convertCount * totalCost;
              break;
            }
          }
        }
      }
    }

    let maxOutput = Infinity;
    for (const [oreName, required] of Object.entries(recipe)) {
      const available = availableOres[oreName] || 0;
      maxOutput = Math.min(maxOutput, Math.floor(available / required));
    }

    const efficiency = getEfficiency(select);
    const result = Math.floor(maxOutput * efficiency);
    outputCell.dataset.raw = result;
    outputCell.textContent = formatTrillions(result);
  });
}

function attachCalcListeners() {
  document.querySelectorAll(".ore-input").forEach(input => {
    input.addEventListener("input", calculateMaterials);
    input.addEventListener("blur", calculateMaterials);
  });

  document.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", calculateMaterials);
  });

  document.getElementById("convertToggle").addEventListener("change", calculateMaterials);
}

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("convertToggle");
  const selects = document.querySelectorAll("table select");
  const oreInputs = document.querySelectorAll(".ore-input");

  function updateSelectsState() {
    selects.forEach(select => {
      select.disabled = !toggle.checked;
    });
  }

  toggle.addEventListener("change", updateSelectsState);
  updateSelectsState();

  oreInputs.forEach(input => {
    let lastRawValue = input.value;

    input.addEventListener("focus", () => {
      input.value = lastRawValue;
    });

    input.addEventListener("input", () => {
      lastRawValue = input.value;
    });

    input.addEventListener("blur", () => {
      const parsed = parseInputToNumber(input.value);
      lastRawValue = formatTrillions(parsed);
      input.value = lastRawValue;
    });
  });

  attachCalcListeners();
  calculateMaterials();
});

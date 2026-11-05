import { jointDefinitions } from "./jointData.js";

export const CSV_COLUMNS = [
  "time",
  ...jointDefinitions.flatMap(({ id }) => [
    `${id}_X`,
    `${id}_Y`,
    `${id}_Z`,
  ]),
];

const numericFieldPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

function splitCsvRow(line, lineNumber) {
  const fields = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += character;
      }
      continue;
    }

    if (character === ",") {
      fields.push(field.trim());
      field = "";
      afterQuote = false;
    } else if (afterQuote) {
      if (!/\s/.test(character)) {
        throw new Error(`${lineNumber}行目: 引用符の後に不正な文字があります`);
      }
    } else if (character === '"') {
      if (field.trim() !== "") {
        throw new Error(`${lineNumber}行目: 引用符の位置が不正です`);
      }
      field = "";
      quoted = true;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error(`${lineNumber}行目: 引用符が閉じていません`);
  fields.push(field.trim());
  return fields;
}

function parseNumericField(value, lineNumber, columnNumber) {
  if (!numericFieldPattern.test(value)) {
    throw new Error(`${lineNumber}行目 ${columnNumber}列目: 数値が不正です`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${lineNumber}行目 ${columnNumber}列目: 有限の数値が必要です`);
  }
  return number;
}

export function parseCsvPoseFrames(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error("CSVファイルが空です");
  }

  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (lines.some((line) => line.trim() === "")) {
    throw new Error("空行は使用できません（末尾の改行は除く）");
  }

  const rows = lines.map((line, index) => splitCsvRow(line, index + 1));
  const firstRow = rows[0];
  const hasHeader = firstRow.length === CSV_COLUMNS.length
    && firstRow.every((column, index) => column === CSV_COLUMNS[index]);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const firstDataLineNumber = hasHeader ? 2 : 1;

  if (!hasHeader && firstRow.length !== CSV_COLUMNS.length) {
    throw new Error(`1行目はヘッダーか、${CSV_COLUMNS.length}列のデータ行にしてください`);
  }
  if (!hasHeader && firstRow.some((value) => !numericFieldPattern.test(value))) {
    throw new Error("ヘッダーの列名または順番がCSV_FORMAT.mdの仕様と一致しません");
  }
  if (dataRows.length < 2) {
    throw new Error("再生には時刻の異なるデータ行が2行以上必要です");
  }

  const frames = [];
  for (const [index, row] of dataRows.entries()) {
    const lineNumber = firstDataLineNumber + index;
    if (row.length !== CSV_COLUMNS.length) {
      throw new Error(`${lineNumber}行目: ${CSV_COLUMNS.length}列が必要ですが、${row.length}列です`);
    }

    const values = row.map((value, columnIndex) =>
      parseNumericField(value, lineNumber, columnIndex + 1),
    );
    const time = values[0];
    const previousFrame = frames[frames.length - 1];
    if (previousFrame && time <= previousFrame.time) {
      throw new Error(`${lineNumber}行目: 時刻は重複なしの昇順にしてください`);
    }

    const joints = {};
    let valueIndex = 1;
    for (const { id } of jointDefinitions) {
      joints[id] = {
        x: values[valueIndex],
        y: values[valueIndex + 1],
        z: values[valueIndex + 2],
      };
      valueIndex += 3;
    }
    frames.push({ time, joints });
  }

  return frames;
}

// Select the most recent recorded row at or before the requested time; no interpolation.
export function getCsvFrameAtTime(frames, time) {
  if (!Array.isArray(frames) || frames.length === 0 || !Number.isFinite(time)) {
    throw new Error("CSV frames and a finite time are required");
  }

  const first = frames[0];
  const last = frames[frames.length - 1];
  const targetTime = Math.min(last.time, Math.max(first.time, time));
  let low = 0;
  let high = frames.length - 1;
  let selectedIndex = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].time <= targetTime) {
      selectedIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const frame = frames[selectedIndex];
  return {
    time: frame.time,
    joints: Object.fromEntries(
      jointDefinitions.map(({ id }) => [id, { ...frame.joints[id] }]),
    ),
  };
}

import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const inputPath = path.resolve(process.cwd(), "records.json")
const outputPath = path.resolve(process.cwd(), process.argv[2] ?? "records.stress.json")
const countPerCompany = Number(process.argv[3] ?? 10000)

if (!Number.isInteger(countPerCompany) || countPerCompany <= 0) {
  throw new Error("countPerCompany must be a positive integer")
}

const raw = await readFile(inputPath, "utf8")
const source = JSON.parse(raw)

const nextData = {}

for (const [company, records] of Object.entries(source)) {
  if (!Array.isArray(records) || records.length === 0) {
    nextData[company] = []
    continue
  }

  const generated = Array.from({ length: countPerCompany }, (_, index) => {
    const template = records[index % records.length]
    const sequence = String(index + 1).padStart(5, "0")

    return {
      ...template,
      _id: `${company}-${sequence}`,
      what_id: `${template.what_id}-${sequence}`,
      id_prestazione: `${template.id_prestazione}-${(index % 200) + 1}`,
      prezzo: Number((template.prezzo + (index % 25)).toFixed(2)),
    }
  })

  nextData[company] = generated
}

await writeFile(outputPath, JSON.stringify(nextData, null, 2) + "\n", "utf8")
console.log(`Generated stress dataset at ${outputPath}`)

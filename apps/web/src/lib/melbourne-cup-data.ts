// Melbourne Cup 2025 default data

export interface HorseData {
  number: number
  name: string
  jockey: string
}

export const MELBOURNE_CUP_2025_DATE = '2025-11-04T15:00:00+11:00' // First Tuesday in November 2025, 3:00 PM AEDT

export const MELBOURNE_CUP_2025_HORSES: HorseData[] = [
  { number: 1, name: 'TBA', jockey: 'TBA' },
  { number: 2, name: 'TBA', jockey: 'TBA' },
  { number: 3, name: 'TBA', jockey: 'TBA' },
  { number: 4, name: 'TBA', jockey: 'TBA' },
  { number: 5, name: 'TBA', jockey: 'TBA' },
  { number: 6, name: 'TBA', jockey: 'TBA' },
  { number: 7, name: 'TBA', jockey: 'TBA' },
  { number: 8, name: 'TBA', jockey: 'TBA' },
  { number: 9, name: 'TBA', jockey: 'TBA' },
  { number: 10, name: 'TBA', jockey: 'TBA' },
  { number: 11, name: 'TBA', jockey: 'TBA' },
  { number: 12, name: 'TBA', jockey: 'TBA' },
  { number: 13, name: 'TBA', jockey: 'TBA' },
  { number: 14, name: 'TBA', jockey: 'TBA' },
  { number: 15, name: 'TBA', jockey: 'TBA' },
  { number: 16, name: 'TBA', jockey: 'TBA' },
  { number: 17, name: 'TBA', jockey: 'TBA' },
  { number: 18, name: 'TBA', jockey: 'TBA' },
  { number: 19, name: 'TBA', jockey: 'TBA' },
  { number: 20, name: 'TBA', jockey: 'TBA' },
  { number: 21, name: 'TBA', jockey: 'TBA' },
  { number: 22, name: 'TBA', jockey: 'TBA' },
  { number: 23, name: 'TBA', jockey: 'TBA' },
  { number: 24, name: 'TBA', jockey: 'TBA' }
]

// Sample field for demonstration/testing (Melbourne Cup 2024 actual field)
export const SAMPLE_MELBOURNE_CUP_FIELD: HorseData[] = [
  { number: 1, name: 'Vauban', jockey: 'W. Buick' },
  { number: 2, name: 'Buckaroo', jockey: 'J. McDonald' },
  { number: 3, name: 'Onesmoothoperator', jockey: 'C. Williams' },
  { number: 4, name: 'Sharp N Smart', jockey: 'B. Thompson' },
  { number: 5, name: 'Zardozi', jockey: 'A. Hamelin' },
  { number: 6, name: 'Absurde', jockey: 'J. Allen' },
  { number: 7, name: 'Interpretation', jockey: 'A. Badel' },
  { number: 8, name: 'Okita Soushi', jockey: 'D. Yendall' },
  { number: 9, name: 'Maotai', jockey: 'K. Parr' },
  { number: 10, name: 'Saint George', jockey: 'D. Lane' },
  { number: 11, name: 'Circle Of Fire', jockey: 'L. Currie' },
  { number: 12, name: 'Warmonger', jockey: 'T. Nugent' },
  { number: 13, name: 'Manzoice', jockey: 'J. Bowditch' },
  { number: 14, name: 'Valiant King', jockey: 'M. Poy' },
  { number: 15, name: 'Kovalica', jockey: 'J. McNeil' },
  { number: 16, name: 'Warp Speed', jockey: 'M. Walker' },
  { number: 17, name: 'Knight\'s Choice', jockey: 'R. Dolan' },
  { number: 18, name: 'Athabascan', jockey: 'C. Newitt' },
  { number: 19, name: 'Valiant Prince', jockey: 'Z. Lloyd' },
  { number: 20, name: 'Land Legend', jockey: 'B. Shinn' },
  { number: 21, name: 'Mostly Cloudy', jockey: 'M. Dee' },
  { number: 22, name: 'Positivity', jockey: 'M. Zahra' },
  { number: 23, name: 'Francophone', jockey: 'T. Piccone' },
  { number: 24, name: 'Just Fine', jockey: 'B. McDougall' }
]

// CSV templates
export const generateHorseCSV = (horses: HorseData[]): string => {
  const header = 'number,name,jockey\n'
  const rows = horses.map(horse => `${horse.number},"${horse.name}","${horse.jockey}"`).join('\n')
  return header + rows
}

export const parseHorseCSV = (csv: string): HorseData[] => {
  const lines = csv.trim().split('\n')
  const hasHeader = lines[0]?.toLowerCase().includes('number') || lines[0]?.toLowerCase().includes('name')
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line, index) => {
    const [numberStr, name, jockey] = line.split(',').map(field =>
      field.replace(/^["']|["']$/g, '').trim()
    )

    return {
      number: parseInt(numberStr) || (index + 1),
      name: name || `Horse ${index + 1}`,
      jockey: jockey || 'TBA'
    }
  }).filter(horse => horse.name && horse.name !== '')
}
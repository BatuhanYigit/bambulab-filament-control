import type { CatalogBrand, TempProfile } from './types'

// Yaygın sıcaklık profilleri (üretici dökümanları + topluluk verisi temel alınmıştır)
const T = {
  pla: { nozzleMin: 190, nozzleMax: 230, bedMin: 35, bedMax: 55, fan: '100%', drying: '55°C / 8 saat' } as TempProfile,
  plaMatte: { nozzleMin: 195, nozzleMax: 230, bedMin: 35, bedMax: 55, fan: '100%', drying: '55°C / 8 saat' } as TempProfile,
  plaSilk: { nozzleMin: 210, nozzleMax: 235, bedMin: 45, bedMax: 60, fan: '80%', drying: '55°C / 8 saat' } as TempProfile,
  plaCf: { nozzleMin: 210, nozzleMax: 240, bedMin: 35, bedMax: 55, fan: '80%', drying: '55°C / 8 saat' } as TempProfile,
  petg: { nozzleMin: 230, nozzleMax: 260, bedMin: 70, bedMax: 80, fan: '50%', drying: '65°C / 8 saat' } as TempProfile,
  abs: { nozzleMin: 240, nozzleMax: 280, bedMin: 90, bedMax: 100, enclosure: true, fan: '0-20%', drying: '80°C / 4 saat' } as TempProfile,
  asa: { nozzleMin: 240, nozzleMax: 280, bedMin: 90, bedMax: 100, enclosure: true, fan: '0-20%', drying: '80°C / 4 saat' } as TempProfile,
  tpu: { nozzleMin: 200, nozzleMax: 240, bedMin: 35, bedMax: 45, fan: '50%', drying: '70°C / 8 saat' } as TempProfile,
  paCf: { nozzleMin: 270, nozzleMax: 300, bedMin: 90, bedMax: 100, enclosure: true, fan: '0-20%', drying: '80°C / 12 saat' } as TempProfile,
  support: { nozzleMin: 190, nozzleMax: 230, bedMin: 35, bedMax: 55, fan: '100%' } as TempProfile
}

const c = (name: string, hex: string, code?: string) => ({ name, hex, code })

export const SEED_CATALOG: CatalogBrand[] = [
  {
    id: 'bambu',
    brand: 'Bambu Lab',
    region: 'Global',
    website: 'https://bambulab.com',
    materials: [
      {
        material: 'PLA Basic',
        type: 'PLA',
        temp: { ...T.pla, nozzleMin: 190, nozzleMax: 230 },
        defaultNetWeight: 1000,
        colors: [
          c('Jade White', '#FFFFFF'), c('Beige', '#F7E6DE'), c('Gold', '#E4BD68'),
          c('Silver', '#A6A9AA'), c('Light Gray', '#D1D3D5'), c('Gray', '#8E9089'),
          c('Dark Gray', '#545454'), c('Black', '#000000'), c('Scarlet Red', '#DE4343'),
          c('Red', '#C12E1F'), c('Maroon Red', '#9D2235'), c('Pink', '#F55A74'),
          c('Hot Pink', '#F5547C'), c('Magenta', '#EC008C'), c('Orange', '#FF6A13'),
          c('Pumpkin Orange', '#FF9016'), c('Sunflower Yellow', '#FEC600'), c('Yellow', '#F4EE2A'),
          c('Bright Green', '#BECF00'), c('Bambu Green', '#00AE42'), c('Mistletoe Green', '#3F8E43'),
          c('Turquoise', '#00B1B7'), c('Cyan', '#0086D6'), c('Cobalt Blue', '#0056B8'),
          c('Blue', '#0A2989'), c('Blue Grey', '#5B6579'), c('Purple', '#5E43B7'),
          c('Indigo Purple', '#482960'), c('Brown', '#9D432C'), c('Cocoa Brown', '#6F5034'),
          c('Bronze', '#847D48')
        ]
      },
      {
        material: 'PLA Matte',
        type: 'PLA',
        temp: T.plaMatte,
        defaultNetWeight: 1000,
        colors: [
          c('Ivory White', '#FFFFFF'), c('Bone White', '#CBC6B8'), c('Desert Tan', '#E8DBB7'),
          c('Lemon Yellow', '#F7D959'), c('Mandarin Orange', '#F99963'), c('Caramel', '#AE835B'),
          c('Latte Brown', '#D3B7A7'), c('Terracotta', '#B15533'), c('Dark Brown', '#7D6556'),
          c('Dark Chocolate', '#4D3324'), c('Red', '#C12E1F'), c('Dark Red', '#BB3D43'),
          c('Sakura Pink', '#E8AFCF'), c('Plum', '#950051'), c('Lilac Purple', '#AE96D4'),
          c('Apple Green', '#C2E189'), c('Grass Green', '#61C680'), c('Dark Green', '#68724D'),
          c('Charcoal', '#1A1A1A'), c('Ash Gray', '#9B9EA0'), c('Nardo Gray', '#757575')
        ]
      },
      {
        material: 'PLA Silk+',
        type: 'PLA',
        temp: T.plaSilk,
        defaultNetWeight: 1000,
        colors: [
          c('Gold', '#D6A622'), c('Silver', '#C8C8C8'), c('Champagne', '#E6C99B'),
          c('Blue', '#1E7FCB'), c('Purple', '#8B5CF6'), c('Pink', '#F36EA9'),
          c('Green', '#2BB673'), c('Candy Red', '#D12E2E')
        ]
      },
      {
        material: 'PETG HF',
        type: 'PETG',
        temp: { ...T.petg, nozzleMin: 240, nozzleMax: 270 },
        defaultNetWeight: 1000,
        colors: [
          c('White', '#FFFFFF'), c('Black', '#000000'), c('Gray', '#8E9089'),
          c('Red', '#BB3D43'), c('Orange', '#FF6A13'), c('Yellow', '#F4EE2A'),
          c('Green', '#00AE42'), c('Blue', '#0A60B0'), c('Lime Green', '#9DCB51')
        ]
      },
      {
        material: 'ABS',
        type: 'ABS',
        temp: T.abs,
        defaultNetWeight: 1000,
        colors: [
          c('White', '#FFFFFF'), c('Black', '#000000'), c('Gray', '#8E9089'),
          c('Red', '#C12E1F'), c('Orange', '#FF6A13'), c('Yellow', '#F4EE2A'),
          c('Green', '#00AE42'), c('Blue', '#0A2989'), c('Silver', '#A6A9AA')
        ]
      },
      {
        material: 'ASA',
        type: 'ASA',
        temp: T.asa,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#000000'), c('Gray', '#8E9089'), c('Red', '#C12E1F')]
      },
      {
        material: 'TPU 95A HF',
        type: 'TPU',
        temp: T.tpu,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#000000'), c('Gray', '#8E9089'), c('Red', '#C12E1F'), c('Blue', '#0A60B0'), c('Yellow', '#F4EE2A')]
      },
      {
        material: 'PLA-CF',
        type: 'PLA',
        temp: T.plaCf,
        defaultNetWeight: 1000,
        colors: [c('Black', '#1A1A1A'), c('Burgundy Red', '#7A2E33'), c('Matcha Green', '#5C7A4A'), c('Iris Purple', '#5B4B8A'), c('Jeans Blue', '#3A5A7A')]
      },
      {
        material: 'PAHT-CF',
        type: 'PA',
        temp: T.paCf,
        defaultNetWeight: 1000,
        colors: [c('Black', '#1A1A1A')]
      },
      {
        material: 'Support for PLA/PETG',
        type: 'Support',
        temp: T.support,
        defaultNetWeight: 500,
        colors: [c('Nature', '#EFE7D6'), c('Black', '#1A1A1A')]
      }
    ]
  },
  {
    id: 'esun',
    brand: 'eSun',
    region: 'Global',
    website: 'https://www.esun3d.com',
    materials: [
      {
        material: 'PLA+',
        type: 'PLA',
        temp: { ...T.pla, nozzleMin: 205, nozzleMax: 225 },
        defaultNetWeight: 1000,
        colors: [
          c('Cold White', '#FAFAFA'), c('Natural', '#EDE8DC'), c('Black', '#1A1A1A'),
          c('Gray', '#8A8D8F'), c('Red', '#D32F2F'), c('Orange', '#F57C00'),
          c('Yellow', '#FBC02D'), c('Green', '#43A047'), c('Light Blue', '#4FC3F7'),
          c('Blue', '#1565C0'), c('Purple', '#7B1FA2'), c('Pink', '#EC407A'),
          c('Brown', '#6D4C41'), c('Silver', '#BDBDBD')
        ]
      },
      {
        material: 'eSilk PLA',
        type: 'PLA',
        temp: T.plaSilk,
        defaultNetWeight: 1000,
        colors: [c('Silk Gold', '#D4AF37'), c('Silk Silver', '#C0C0C0'), c('Silk Copper', '#B87333'), c('Silk Red', '#C62828'), c('Silk Blue', '#1976D2'), c('Silk Green', '#2E7D32')]
      },
      {
        material: 'PETG',
        type: 'PETG',
        temp: T.petg,
        defaultNetWeight: 1000,
        colors: [c('Solid White', '#FFFFFF'), c('Solid Black', '#1A1A1A'), c('Red', '#D32F2F'), c('Blue', '#1565C0'), c('Green', '#2E7D32'), c('Transparent', '#E8F0EE')]
      },
      {
        material: 'ABS+',
        type: 'ABS',
        temp: T.abs,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#1A1A1A'), c('Gray', '#8A8D8F'), c('Red', '#D32F2F'), c('Blue', '#1565C0')]
      },
      {
        material: 'eTPU-95A',
        type: 'TPU',
        temp: T.tpu,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#1A1A1A'), c('Red', '#D32F2F'), c('Transparent', '#E8F0EE')]
      }
    ]
  },
  {
    id: 'polymaker',
    brand: 'Polymaker',
    region: 'Global',
    website: 'https://polymaker.com',
    materials: [
      {
        material: 'PolyTerra PLA',
        type: 'PLA',
        temp: { ...T.plaMatte, nozzleMin: 190, nozzleMax: 230 },
        defaultNetWeight: 1000,
        colors: [
          c('Cotton White', '#F5F5F0'), c('Charcoal Black', '#1A1A1A'), c('Muted Red', '#C0392B'),
          c('Sunrise Orange', '#E67E22'), c('Savannah Yellow', '#F1C40F'), c('Forest Green', '#27AE60'),
          c('Sapphire Blue', '#2980B9'), c('Lavender Purple', '#9B59B6'), c('Marble White', '#ECECEC'),
          c('Army Green', '#6B8E23'), c('Fossil Grey', '#9E9E9E')
        ]
      },
      {
        material: 'PolyLite PLA',
        type: 'PLA',
        temp: T.pla,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#1A1A1A'), c('Red', '#D32F2F'), c('Blue', '#1565C0'), c('Yellow', '#FBC02D'), c('Green', '#43A047')]
      },
      {
        material: 'PolyLite PETG',
        type: 'PETG',
        temp: T.petg,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#1A1A1A'), c('Grey', '#9E9E9E'), c('Teal', '#008080')]
      }
    ]
  },
  {
    id: 'sunlu',
    brand: 'SUNLU',
    region: 'Global',
    website: 'https://www.sunlu.com',
    materials: [
      {
        material: 'PLA+',
        type: 'PLA',
        temp: { ...T.pla, nozzleMin: 205, nozzleMax: 225 },
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#1A1A1A'), c('Grey', '#9E9E9E'), c('Red', '#D32F2F'), c('Orange', '#F57C00'), c('Yellow', '#FBC02D'), c('Green', '#43A047'), c('Blue', '#1565C0')]
      },
      {
        material: 'Silk PLA',
        type: 'PLA',
        temp: T.plaSilk,
        defaultNetWeight: 1000,
        colors: [c('Silk Gold', '#D4AF37'), c('Silk Silver', '#C0C0C0'), c('Silk Rainbow', '#FF6FD8'), c('Silk Blue', '#1976D2'), c('Silk Red', '#C62828')]
      },
      {
        material: 'PETG',
        type: 'PETG',
        temp: T.petg,
        defaultNetWeight: 1000,
        colors: [c('White', '#FFFFFF'), c('Black', '#1A1A1A'), c('Transparent', '#E8F0EE'), c('Red', '#D32F2F'), c('Blue', '#1565C0')]
      }
    ]
  },
  {
    id: 'porima',
    brand: 'Porima',
    region: 'Türkiye',
    website: 'https://porima3d.com',
    materials: [
      {
        material: 'PLA',
        type: 'PLA',
        temp: { ...T.pla, nozzleMin: 190, nozzleMax: 220, bedMin: 50, bedMax: 60 },
        defaultNetWeight: 1000,
        colors: [
          c('Beyaz', '#FFFFFF'), c('Siyah', '#1A1A1A'), c('Gri', '#9E9E9E'),
          c('Kırmızı', '#D32F2F'), c('Turuncu', '#F57C00'), c('Sarı', '#FBC02D'),
          c('Yeşil', '#2E7D32'), c('Açık Yeşil', '#7CB342'), c('Mavi', '#1565C0'),
          c('Açık Mavi', '#4FC3F7'), c('Lacivert', '#0D47A1'), c('Mor', '#7B1FA2'),
          c('Pembe', '#EC407A'), c('Kahverengi', '#6D4C41'), c('Altın', '#D4AF37'),
          c('Gümüş', '#BDBDBD')
        ]
      },
      {
        material: 'PLA Pastel',
        type: 'PLA',
        temp: { ...T.plaMatte, nozzleMin: 190, nozzleMax: 220, bedMin: 50, bedMax: 60 },
        defaultNetWeight: 1000,
        colors: [
          c('Pastel Mavi', '#A7C7E7'), c('Pastel Yeşil', '#B5E7A0'), c('Pastel Pembe', '#F7C5CC'),
          c('Pastel Sarı', '#FDFD96'), c('Pastel Mor', '#C3B1E1'), c('Pastel Turuncu', '#FFB997')
        ]
      },
      {
        material: 'Silk PLA',
        type: 'PLA',
        temp: { ...T.plaSilk, bedMin: 50, bedMax: 60 },
        defaultNetWeight: 1000,
        colors: [c('Silk Altın', '#D4AF37'), c('Silk Gümüş', '#C0C0C0'), c('Silk Bakır', '#B87333'), c('Silk Mavi', '#1976D2'), c('Silk Kırmızı', '#C62828'), c('Silk Yeşil', '#2E7D32')]
      },
      {
        material: 'PETG',
        type: 'PETG',
        temp: { ...T.petg, bedMin: 70, bedMax: 80 },
        defaultNetWeight: 1000,
        colors: [c('Beyaz', '#FFFFFF'), c('Siyah', '#1A1A1A'), c('Şeffaf', '#E8F0EE'), c('Kırmızı', '#D32F2F'), c('Mavi', '#1565C0'), c('Yeşil', '#2E7D32')]
      },
      {
        material: 'ABS',
        type: 'ABS',
        temp: T.abs,
        defaultNetWeight: 1000,
        colors: [c('Beyaz', '#FFFFFF'), c('Siyah', '#1A1A1A'), c('Gri', '#9E9E9E'), c('Kırmızı', '#D32F2F')]
      }
    ]
  }
]

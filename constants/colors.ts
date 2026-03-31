export const gray = {
  '50': '#fafaf9',
  '100': '#f5f5f4',
  '200': '#e7e5e4',
  '300': '#d6d3d1',
  '400': '#a6a09b',
  '500': '#79716b',
  '600': '#57534d',
  '700': '#44403b',
  '800': '#292524',
  '900': '#1c1917',
  '950': '#0c0a09',
}

export const primary = {
  '50': '#edfbff',
  '100': '#d7f3ff',
  '200': '#b9ecff',
  '300': '#88e2ff', // logo bottle
  '400': '#50cfff',
  '500': '#28b4ff',
  '600': '#0a95ff',
  '700': '#0a7eeb',
  '800': '#0f64be',
  '900': '#135695', // logo bg
  '950': '#11355a',
}

export const secondary = {
  '50': '#eefff3',
  '100': '#d6ffe6',
  '200': '#b0ffce',
  '300': '#72ffa9',
  '400': '#2efa7c',
  '500': '#04e359',
  '600': '#00bd46',
  '700': '#01963b',
  '800': '#077432',
  '900': '#085f2c',
  '950': '#003616',
}

export const blue = {
  '50': '#eef8ff',
  '100': '#d9efff',
  '200': '#bce4ff',
  '300': '#8ed5ff',
  '400': '#59bbff',
  '500': '#389fff',
  '600': '#1b7df5',
  '700': '#1466e1',
  '800': '#1752b6',
  '900': '#19478f',
  '950': '#142c57',
}

export const green = {
  '50': '#f1f8f3',
  '100': '#ddeee0',
  '200': '#bdddc5',
  '300': '#91c4a1',
  '400': '#62a57a',
  '500': '#41885d',
  '600': '#2f6c48',
  '700': '#25573b',
  '800': '#1f442f',
  '900': '#1b3928',
  '950': '#0e2017',
}

export const red = {
  '50': '#fdf3f3',
  '100': '#fbe8e8',
  '200': '#f8d3d6',
  '300': '#f1b0b4',
  '400': '#e9838c',
  '500': '#dc5765',
  '600': '#c7374d',
  '700': '#a8283f',
  '800': '#8d243b',
  '900': '#792238',
  '950': '#4b101d',
}

export type Rating = 1 | 2 | 3 | 4 | 5 | 'good' | 'average' | 'poor'

export const ratingColor = {
  good: '#28e22b',
  average: '#e5ca1f',
  poor: '#ff6a6a',
  1: '#fde3e3',
  2: '#e5ca1f',
  3: '#fcfee7',
  4: '#effef2',
  5: '#c6fbd3',
}

export const getRatingColor = (rating: Rating) => {
  return ratingColor[rating]
}

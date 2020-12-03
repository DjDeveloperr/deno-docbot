export const reduceArray = (array: string[], limit: number) => {
  let newArray: string[] = []
  for (let i = 0; newArray.join('').length < limit; i++) {
    const expectedArray: string[] = [...newArray, array[i]]
    if (expectedArray.join('').length > limit) {
      return newArray
    }
    newArray.push(array[i])
  }
  return newArray
}

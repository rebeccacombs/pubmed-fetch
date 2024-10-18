import getIDsAndData, { buildQuery, } from '../src';
const SECONDS = 1000;
jest.setTimeout(70 * SECONDS)

//const api_key = process.env.NCBI_API_KEY
const authors = ['']
const topics = ['RNAi', "siRNA", "ASO", "mRNA"]
const dateRange = '("2024/09/19"[Date - Create] : "2024/10/15"[Date - Create])'
//const query = buildQuery(authors, topics, dateRange)

test('builds a query', () => {
  const result = buildQuery(authors, topics, dateRange);
  expect(result).toBe(`([Author]) AND (RNAi[Title/Abstract] OR siRNA[Title/Abstract] OR ASO[Title/Abstract] OR mRNA[Title/Abstract]) AND ("2024/09/19"[Date - Create] : "2024/10/15"[Date - Create])`);
});

/*
test('getting all', async () => {
  const ret = await getIDsAndData(query, 2, api_key, true)
  expect(ret).toEqual("returnData")
});
*/
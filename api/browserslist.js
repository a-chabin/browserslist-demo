const browserslist = require('browserslist')
const { agents: caniuseAgents, region: caniuseUnpackRegion } = require('caniuse-lite')
const { version: bv } = require('browserslist/package.json')
const { version: cv } = require('caniuse-lite/package.json')
const wikipediaLinks = require('./data/wikipedia-links.json')

const DEFAULT_QUERY = 'defaults'
const GLOBAL_REGION = 'Global'

async function handler(req, res) {
  let query = req.query.q
  let isExtended = JSON.parse(req.query.extended);
  let region = extractRegionFromQuery(query)

  try {
    res.status(200).json(await getBrowsers(query, region, isExtended))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}

function extractRegionFromQuery(query) {
  let queryHasIn = query.match(/ in ((?:alt-)?[A-Za-z]{2})(?:,|$)/)
  return queryHasIn ? queryHasIn[1] : undefined
}

async function getBrowsers(query = DEFAULT_QUERY, region = GLOBAL_REGION, isExtended = false) {
  const loadBrowsersData = async (resolve, reject) => {
    let browsersByDefaultQuery = []
    let browsersByQuery = []

    try {
      let queryWithoutQuotes = query.replace(/'/g, '')
      browsersByDefaultQuery = isExtended ? query === DEFAULT_QUERY ? [] : browserslist() : []

      browsersByQuery = query !== DEFAULT_QUERY
        ? browserslist(queryWithoutQuotes)
        : browserslist()

    } catch (e) {
      if (e.browserslist) {
        reject(e.message)
      }
    }

    let browsersGroups = {};

    const addVersion = async (browser, inQuery) => {
      let [id, version] = browser.split(' ')
      let coverage = region === GLOBAL_REGION
        ? getGlobalCoverage(id, version)
        : await getRegionCoverage(id, version, region);

      const versionData = {
        v: version,
        inQuery,
        coverage: round(coverage)
      };

      !browsersGroups[id]
        ? browsersGroups[id] = { versions: [versionData] }
        : browsersGroups[id].versions.push(versionData)
    };

    for (let browser of browsersByQuery) {
      await addVersion(browser, true);
    }

    for (let browser of browsersByDefaultQuery) {
      await addVersion(browser, false);
    }

    const sortByCoverage = (a, b) => a.coverage > b.coverage
      ? -1
      : a.coverage < b.coverage
        ? 1
        : 0;

    const browsers = Object.entries(browsersGroups).map(([id, data]) => {
      let { browser: name, usage_global: usageGlobal } = caniuseAgents[id];
      // TODO Add regional coverage
      let coverage = round(Object.values(usageGlobal).reduce((a, b) => a + b, 0))
      let wiki = wikipediaLinks[id]
      let versions = data.versions.sort(sortByCoverage)

      return {
        id,
        name,
        wiki,
        coverage,
        versions
      }
    }).sort(sortByCoverage);

    resolve({
      query,
      region,
      coverage: browserslist.coverage(browsersByQuery, region),
      bv,
      cv,
      browsers
    })
  };

  return new Promise(loadBrowsersData);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function getGlobalCoverage(id, version) {
  return getCoverage(caniuseAgents[id].usage_global, version);
}

// TODO Show region not found if not exists 
async function getRegionCoverage(id, version, region) {
  const { default: regionData } = await import(
    `caniuse-lite/data/regions/${region}.js`
  )
  return getCoverage(caniuseUnpackRegion(regionData)[id], version)
}

function getCoverage(data, version) {
  let [lastVersion] = Object.keys(data).sort((a, b) => Number(b) - Number(a))

  // If specific version coverage is missing, fall back to 'version zero'
  return data[version] !== undefined ? data[version] : data[lastVersion]
}

module.exports = handler
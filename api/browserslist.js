const browserslist = require('browserslist')
const { version: bv } = require('browserslist/package.json')
const { version: cv } = require('caniuse-lite/package.json')
const { agents: caniuseAgents, region: caniuseRegion } = require('caniuse-lite')

const DEFAULT_QUERY = 'defaults'
const GLOBAL_REGION = 'Global'

async function handler(req, res) {
  let query = req.query.q

  try {
    res.status(200).json(await getBrowsers(query))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}

async function getBrowsers(query = DEFAULT_QUERY) {
  let region = parseRegionFromQuery(query) || GLOBAL_REGION

  // TODO Add support `Node > 0` query
  let loadBrowsersData = async (resolve, reject) => {
    let browsersByQuery = []

    try {
      browsersByQuery = browserslist(query)
    } catch (error) {
      reject(
        error.browserslist
          ? error.message
          : `Unknown browser query \`${query}\`.`
      )
      return
    }

    let browsersGroups = {}
    let browsersGroupsKeys = []

    for (let browser of browsersByQuery) {
      if (browsersGroupsKeys.includes(browser)) {
        return
      }

      browsersGroupsKeys.push(browser)
      let [id, version] = browser.split(' ')
      let versionCoverage =
        region === GLOBAL_REGION
          ? getGlobalCoverage(id, version)
          : await getRegionCoverage(id, version, region)

      let versionData = { [`${version}`]: roundNumber(versionCoverage) }

      if (!browsersGroups[id]) {
        browsersGroups[id] = { versions: versionData }
      } else {
        Object.assign(browsersGroups[id].versions, versionData)
      }
    }

    let browsers = Object.entries(browsersGroups)
      .map(([id, { versions }]) => {
        let { browser: name, usage_global: usageGlobal } = caniuseAgents[id]
        // TODO Add regional coverage
        let coverage = roundNumber(
          Object.values(usageGlobal).reduce((a, b) => a + b, 0)
        )

        return {
          id,
          name,
          coverage,
          versions
        }
      })
      .sort((a, b) => b.coverage - a.coverage)

    resolve({
      query,
      region,
      coverage: browserslist.coverage(browsersByQuery, region),
      versions: {
        browserslist: bv,
        caniuse: cv
      },
      browsers
    })
  }

  return new Promise(loadBrowsersData)
}

function parseRegionFromQuery(query) {
  let queryParsed = browserslist.parse(query)
  // TODO Take the most frequent region in large queries?
  let firstQueryRegion = queryParsed.find(x => x.place)
  return firstQueryRegion ? firstQueryRegion.place : null
}

function getGlobalCoverage(id, version) {
  return getCoverage(caniuseAgents[id].usage_global, version)
}

async function getRegionCoverage(id, version, region) {
  try {
    const { default: regionData } = await import(
      `caniuse-lite/data/regions/${region}.js`
    )
    return getCoverage(caniuseRegion(regionData)[id], version)
  } catch (e) {
    console.log(e);
    throw new Error(`Unknown region name \`${region}\`.`)
  }
}

function getCoverage(data, version) {
  let [lastVersion] = Object.keys(data).sort((a, b) => Number(b) - Number(a))

  // If specific version coverage is missing, fall back to 'version zero'
  return data[version] !== undefined ? data[version] : data[lastVersion]
}

function roundNumber(value) {
  return Math.round(value * 100) / 100
}

module.exports = handler
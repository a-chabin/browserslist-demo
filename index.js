const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/'
const queryInput = document.querySelector('.QueryTextArea')

queryInput.addEventListener('input', () => {
  try {
    sendQuery(queryInput.value)
  } catch (e) {
    console.log(e)
  }
})

sendQuery('defaults')

async function sendQuery(query) {
  const isExtended = new URLSearchParams(window.location.search).get('extended') || 'false';
  let response = await fetch(`/api/browserslist/?q=${encodeURIComponent(query)}&extended=${isExtended}`)
  let data = await response.json();

  if (Object.keys(data).length === 0) {
    return;
  }

  updateBrowsersStats(data);
  updateGlobalCoverageBar(data);
}

function updateGlobalCoverageBar(data) {
  const element = document.getElementById('global-coverage-bar');
  element.innerHTML = '';
  data.browsers.forEach((item) => {
    const alpha = 1 - 1/(item.coverage);
    const itemElem = document.createElement('li');
    itemElem.classList.add('GlobalCoverageBar__item');
    itemElem.setAttribute('style', `
    --p: ${item.coverage};
    --a: ${alpha};
    `)

    itemElem.dataset.browserName = item.coverage > 10 ? item.name : '';
    element.appendChild(itemElem);
  })
}

function createCoverageCell(coverage) {
  const coveragePercentageHtmlString = (cov) => cov + '%';
  const coveragePercentageCssString = (cov) => {
    const result =  Math.log(1 + cov) * 100 / Math.log(1 + 100);
    if (result === 0) {
      return '0';
    } else if (result > 5) {
      return result + '%';
    }
    return '1px';
  }

  const coverageCell = document.createElement('td');
  coverageCell.classList.add('BrowsersStat__td');
  coverageCell.innerHTML = coveragePercentageHtmlString(coverage);
  coverageCell.classList.add('BrowsersStat__td--coverage');
  coverageCell.setAttribute('style', `--c:${coveragePercentageCssString(coverage)}`);
  return coverageCell;
}

function createVersionCell(version) {
  const versionCell = document.createElement('td');
  versionCell.classList.add('BrowsersStat__td');
  versionCell.innerHTML = version;
  return versionCell;
}

function updateBrowsersStats(data) {
  const element = document.getElementById('browsers-stats');

  const table = document.createElement('table');
  table.classList.add('BrowsersStat__table');

  data.browsers.forEach(({id, name, wiki, versions}) => {
    const tr = document.createElement('tr');
    tr.classList.add('BrowsersStat__tr');


    const iconCell = document.createElement('td');
    iconCell.classList.add('BrowsersStat__td');
    const iconElem = document.createElement('img');
    iconCell.classList.add('BrowsersStat__icon');
    iconElem.src = `/icons/${id}.png`;
    iconElem.width = 16;
    iconCell.setAttribute('rowspan', versions.length);
    iconCell.appendChild(iconElem);
    tr.appendChild(iconCell);

    const nameCell = document.createElement('td');
    nameCell.classList.add('BrowsersStat__td');
    const nameLink = document.createElement('a');
    nameLink.classList.add('BrowsersStat__link');
    nameLink.href = WIKIPEDIA_URL + wiki;
    nameLink.target = '_blank';
    nameLink.rel = "noreferrer noopener";
    nameCell.setAttribute('rowspan', versions.length);
    nameLink.innerHTML = name;
    nameCell.appendChild(nameLink);
    tr.appendChild(nameCell);

    tr.appendChild(createVersionCell(versions[0].v));

    tr.appendChild(createCoverageCell(versions[0].coverage));

    if (!versions[0].inQuery) {
      tr.style.color = 'rgba(30, 30, 30, 0.4)';
    }

    table.appendChild(tr);

    versions.slice(1).forEach((item) => {
      const {v: version, coverage, inQuery} = item;
      const versionTr = document.createElement('tr');

      versionTr.style.color = !inQuery ? 'rgba(30, 30, 30, 0.4)' : '';

      versionTr.appendChild(createVersionCell(version));

      versionTr.appendChild(createCoverageCell(coverage));

      table.appendChild(versionTr);
    })

  });

  element.innerHTML = '';
  element.appendChild(table);
}
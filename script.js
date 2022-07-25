const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/'
const queryInput = document.getElementById('browsers-input')
const queryErrors = document.getElementById('browsers-input-errors')

queryInput.addEventListener('input', () => {
  try {
    sendQuery(queryInput.value)
    queryErrors.innerHTML = ''
  } catch (e) {
    console.log(e)
    queryErrors.innerHTML = e
  }
})

sendQuery('>5%')

async function sendQuery(query) {
  const isExtended = new URLSearchParams(window.location.search).get('extended') || 'false';
  let response = await fetch(`/api/browserslist/?q=${encodeURIComponent(query)}&extended=${isExtended}`)
  let data = await response.json()

  document.getElementById('browsers-root').innerHTML = `
    <ul style="columns: 3">
        ${data.browsers
          .map(
            ({ id, name, wiki, versions, inQuery }) => `
          <li style="break-inside: avoid">
            <img src="${id}" alt="" />
            <a href="${WIKIPEDIA_URL}${wiki}" target="_blank" rel="noreferrer noopener">${name}</a>

            <ul>
                ${versions
                  .map(
                    ({ v, coverage, inQuery }) => `
                  <li style="${!inQuery ? "color: rgba(0,0,0,.4)" : "font-weight: bold"}">
                    ${v} — ${Math.floor(coverage * 1000) / 1000}%
                  </li>
                `
                  )
                  .join('')}
              </ul>
          </li>
          `).join('')}
    </ul>

    Browserslist ver: ${data.bv}
    <br />
    Data provided by caniuse-db: ${data.cv}
    `
}

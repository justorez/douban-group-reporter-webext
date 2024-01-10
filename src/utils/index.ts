export async function hasCookie() {
  const ck = await chrome.cookies.get({
    url: 'https://www.douban.com',
    name: 'ck'
  })
  return Boolean(ck)
}

export async function getHeaderCookie() {
  const cookies = await chrome.cookies.getAll({
    url: 'https://www.douban.com'
  })

  const exportedCookies = []
  for (const cookie of cookies) {
    const name = cookie.name
    const value = cookie.value
    exportedCookies.push(`${name}=${value}`)
  }
  return exportedCookies.join(';')
}

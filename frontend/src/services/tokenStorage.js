// Tokens live in localStorage when "Remember me" is checked (survive closing
// the browser), or sessionStorage otherwise (cleared when the tab/browser closes).
export function getToken(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

export function setTokens({ access, refresh }, remember) {
  const store = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  store.setItem('access_token', access)
  store.setItem('refresh_token', refresh)
  // make sure there's no stale copy in the other storage
  other.removeItem('access_token')
  other.removeItem('refresh_token')
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
}

export function getRememberedUsername() {
  return localStorage.getItem('remembered_username') || ''
}

export function setRememberedUsername(username, remember) {
  if (remember && username) {
    localStorage.setItem('remembered_username', username)
  } else {
    localStorage.removeItem('remembered_username')
  }
}

export async function fetchEndpoint(url: string, method: string, data: any) {
  return await fetch(url, {
    method,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export async function postEndpoint(url: string, data: any) {
  return fetchEndpoint(url, 'POST', data)
}

export async function putEndpoint(url: string, data: any) {
  return fetchEndpoint(url, 'PUT', data)
}

export async function deleteEndpoint(url: string, data: any) {
  return fetchEndpoint(url, 'DELETE', data)
}

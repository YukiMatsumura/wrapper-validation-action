import * as httpm from 'typed-rest-client/HttpClient'
import * as core from '@actions/core'

const httpc = new httpm.HttpClient(
  'gradle/wrapper-validation-action',
  undefined,
  {allowRetries: true, maxRetries: 3}
)

// Predefined list of checksums
const predefinedChecksums = [
  '91a239400bb638f36a1795d8fdf7939d532cdc7d794d1119b7261aac158b1e60', 
  'e996d452d2645e70c01c11143ca2d3742734a28da2bf61f25c82bdc288c9e637'
];

export async function getValidChecksums(
): Promise<string[]> {
  return predefinedChecksums;
}

export async function fetchValidChecksums(
  allowSnapshots: boolean
): Promise<string[]> {
  core.info("Yuki: checksums fetchValidChecksums called")
  const all = await httpGetJsonArray('https://services.gradle.org/versions/all')
  core.info("Yuki: checksums httpGetJsonArray called")
  const withChecksum = all.filter(
    entry =>
      typeof entry === 'object' &&
      entry != null &&
      entry.hasOwnProperty('wrapperChecksumUrl')
  )
  core.info("Yuki: checksums withChecksum called")
  const allowed = withChecksum.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => allowSnapshots || !entry.snapshot
  )
  core.info("Yuki: checksums allowed called")
  const checksumUrls = allowed.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => entry.wrapperChecksumUrl as string
  )
  core.info("Yuki: checksums checksumUrls called")
  const checksums = await Promise.all(
    checksumUrls.map(async (url: string) => {
      core.info(`Yuki: checksums Processing URL: ${url}`);
      const response = await httpGetText(url);
      core.info(`Yuki: checksums Response from URL: ${url}: ${response}`); // Output the response
      return response;
    })
  )
  core.info("Yuki: checksums checksums called")
  return [...new Set(checksums)]
}

async function httpGetJsonArray(url: string): Promise<unknown[]> {
  return JSON.parse(await httpGetText(url))
}

async function httpGetText(url: string): Promise<string> {
  const response = await httpc.get(url)
  return await response.readBody()
}

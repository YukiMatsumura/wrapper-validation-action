import * as find from './find'
import * as checksums from './checksums'
import * as hash from './hash'
import * as core from '@actions/core'

export async function findInvalidWrapperJars(
  gitRepoRoot: string,
  minWrapperCount: number,
  allowSnapshots: boolean,
  allowChecksums: string[]
): Promise<ValidationResult> {
  core.info("Yuki: findInvalidWrapperJars called")
  const wrapperJars = await find.findWrapperJars(gitRepoRoot)
  core.info("Yuki: find.findWrapperJars called")
  const result = new ValidationResult([], [])
  if (wrapperJars.length < minWrapperCount) {
    result.errors.push(
      `Expected to find at least ${minWrapperCount} Gradle Wrapper JARs but got only ${wrapperJars.length}`
    )
  }
  core.info("Yuki: new ValidationResult called")
  if (wrapperJars.length > 0) {
    core.info("Yuki: wrapperJars.length > 0 called")
    // custom  : const validChecksums = await checksums.getValidChecksums();
    const validChecksums = await checksums.fetchValidChecksums(allowSnapshots)
    core.info("Yuki: checksums.fetchValidChecksums called")
    validChecksums.push(...allowChecksums)
    core.info("Yuki: validChecksums.push called")
    for (const wrapperJar of wrapperJars) {
      const sha = await hash.sha256File(wrapperJar)
      core.info("Yuki: hash.sha256File called")
      if (!validChecksums.includes(sha)) {
        result.invalid.push(new WrapperJar(wrapperJar, sha))
        core.info("Yuki: invalid.push called")
      } else {
        result.valid.push(new WrapperJar(wrapperJar, sha))
        core.info("Yuki: valid.push called")
      }
    }
    core.info("Yuki: for called")
  }
  return result
}

export class ValidationResult {
  valid: WrapperJar[]
  invalid: WrapperJar[]
  errors: string[] = []

  constructor(valid: WrapperJar[], invalid: WrapperJar[]) {
    this.valid = valid
    this.invalid = invalid
  }

  isValid(): boolean {
    return this.invalid.length === 0 && this.errors.length === 0
  }

  toDisplayString(): string {
    let displayString = ''
    if (this.invalid.length > 0) {
      displayString += `✗ Found unknown Gradle Wrapper JAR files:\n${ValidationResult.toDisplayList(
        this.invalid
      )}`
    }
    if (this.errors.length > 0) {
      if (displayString.length > 0) displayString += '\n'
      displayString += `✗ Other validation errors:\n  ${this.errors.join(
        `\n  `
      )}`
    }
    if (this.valid.length > 0) {
      if (displayString.length > 0) displayString += '\n'
      displayString += `✓ Found known Gradle Wrapper JAR files:\n${ValidationResult.toDisplayList(
        this.valid
      )}`
    }
    return displayString
  }

  private static toDisplayList(wrapperJars: WrapperJar[]): string {
    return `  ${wrapperJars.map(wj => wj.toDisplayString()).join(`\n  `)}`
  }
}

export class WrapperJar {
  path: string
  checksum: string

  constructor(path: string, checksum: string) {
    this.path = path
    this.checksum = checksum
  }

  toDisplayString(): string {
    return `${this.checksum} ${this.path}`
  }
}

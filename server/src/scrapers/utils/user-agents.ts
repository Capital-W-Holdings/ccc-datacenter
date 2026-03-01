/**
 * Collection of realistic user agents for rotation
 * Updated regularly to match current browser versions
 */

export const USER_AGENTS = {
  chrome: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  ],
  safari: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ],
}

/**
 * Get all user agents as a flat array
 */
export function getAllUserAgents(): string[] {
  return Object.values(USER_AGENTS).flat()
}

/**
 * Get a random user agent
 */
export function getRandomUserAgent(): string {
  const all = getAllUserAgents()
  return all[Math.floor(Math.random() * all.length)]
}

/**
 * Get a random user agent from a specific browser
 */
export function getRandomUserAgentByBrowser(browser: keyof typeof USER_AGENTS): string {
  const agents = USER_AGENTS[browser]
  return agents[Math.floor(Math.random() * agents.length)]
}

/**
 * User agent rotator class for consistent rotation
 */
export class UserAgentRotator {
  private agents: string[]
  private currentIndex: number = 0

  constructor(browsers?: (keyof typeof USER_AGENTS)[]) {
    if (browsers && browsers.length > 0) {
      this.agents = browsers.flatMap((b) => USER_AGENTS[b])
    } else {
      this.agents = getAllUserAgents()
    }
    // Shuffle the array
    this.shuffle()
  }

  private shuffle(): void {
    for (let i = this.agents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.agents[i], this.agents[j]] = [this.agents[j], this.agents[i]]
    }
  }

  /**
   * Get the next user agent in rotation
   */
  next(): string {
    const agent = this.agents[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.agents.length
    return agent
  }

  /**
   * Reset rotation and reshuffle
   */
  reset(): void {
    this.currentIndex = 0
    this.shuffle()
  }
}

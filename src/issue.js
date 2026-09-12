/**
 * Open or update a GitHub Issue with the Linkfail report.
 */

const MARKER = '<!-- linkfail-report -->';

/**
 * @param {object} options
 * @param {import('@actions/github').GitHub} options.octokit
 * @param {string} options.owner
 * @param {string} options.repo
 * @param {string} options.title
 * @param {string} options.body
 * @returns {Promise<{ number: number, html_url: string, created: boolean }>}
 */
export async function openOrUpdateIssue({
  octokit,
  owner,
  repo,
  title,
  body,
}) {
  const q = `repo:${owner}/${repo} is:issue is:open in:title "${title.replace(/"/g, '')}"`;
  let existing = null;

  try {
    const search = await octokit.rest.search.issuesAndPullRequests({
      q,
      per_page: 5,
    });
    existing =
      search.data.items.find(
        (i) => !i.pull_request && i.title === title,
      ) || null;
  } catch {
    // fallback: list open issues and match title
    const listed = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 50,
    });
    existing = listed.data.find((i) => i.title === title) || null;
  }

  if (existing) {
    const updated = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: existing.number,
      body,
    });
    return {
      number: updated.data.number,
      html_url: updated.data.html_url,
      created: false,
    };
  }

  const created = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    body: body.includes(MARKER) ? body : `${MARKER}\n${body}`,
    labels: ['linkfail'],
  });

  return {
    number: created.data.number,
    html_url: created.data.html_url,
    created: true,
  };
}

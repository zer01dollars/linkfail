/**
 * Upsert a pull-request comment with the Linkfail report marker.
 */

const MARKER = '<!-- linkfail-report -->';

/**
 * @param {object} options
 * @param {import('@actions/github').GitHub} options.octokit
 * @param {string} options.owner
 * @param {string} options.repo
 * @param {number} options.issueNumber  PR number
 * @param {string} options.body
 * @returns {Promise<{ id: number, html_url?: string, created: boolean }|null>}
 */
export async function upsertPrComment({
  octokit,
  owner,
  repo,
  issueNumber,
  body,
}) {
  if (!issueNumber) return null;

  const text = body.includes(MARKER) ? body : `${MARKER}\n${body}`;

  let existing = null;
  try {
    const comments = await octokit.paginate(
      octokit.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 100,
      },
    );
    existing =
      comments.find(
        (c) => typeof c.body === 'string' && c.body.includes(MARKER),
      ) || null;
  } catch {
    // fall through to create
  }

  if (existing) {
    const updated = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: text,
    });
    return {
      id: updated.data.id,
      html_url: updated.data.html_url,
      created: false,
    };
  }

  const created = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: text,
  });
  return {
    id: created.data.id,
    html_url: created.data.html_url,
    created: true,
  };
}

export { MARKER };

# Rule: diagnosis before prescription

Always lead with the **root cause and a confidence level**, then the fix. Never open
with a generic best-practices lecture.

- The first line of any reliability answer names the most likely root cause and how
  confident you are, grounded in the evidence you actually saw (a log line, a
  signature field, a measured bucket).
- A single signature is a *data point*, not a *rate*. If the user implies a systemic
  problem ("success rate is X%"), switch to the systemic branch and **measure/bucket
  the failures before** assigning any cause or percentage.
- Every fix ends with a **verification step** — how the user confirms it worked
  (a status check, a re-measured rate, a clean simulation).

Follow the output contract in `skill/diagnostics.md`:
`Diagnosis → Evidence → Prescribe → Expected → Verify`.

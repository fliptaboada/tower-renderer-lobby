# Fills a fresh tower sandbox with workers in every state, a crew three deep, kept drafts and a worktree with changes.
# From a tower checkout, on a sandbox `npm run sandbox -- up` just made (its sessions are shell stand-ins, not Claude):
#   npm run -s sandbox -- run sh <this repo>/demo/populate.sh
set -e
H="origin: $TOWER_URL"
J='content-type: application/json'
spawn() { curl -s -XPOST "$TOWER_URL/spawn" -H "$H" -H "$J" -d "$1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id'; }
post() { curl -sS -m 2 --unix-socket "$TOWER_SANDBOX/hooks.sock" -H "$J" --data-binary "$2" "http://host/hooks/$1" >/dev/null; }
q() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }

# A new turn that is still running a tool.
working() { # id prompt tool command
  post $1 '{"hook_event_name":"prompt.submit","origin":{"kind":"composer"},"text":'"$(q "$2")"'}'
  post $1 '{"hook_event_name":"UserPromptSubmit","prompt":'"$(q "$2")"'}'
  post $1 '{"hook_event_name":"turn.start","text":'"$(q "$2")"',"turnId":"t-'$1'"}'
  post $1 '{"hook_event_name":"tool.call","tool":"'$3'","command":'"$(q "$4")"',"tool_use_id":"u-'$1'"}'
  post $1 '{"hook_event_name":"PreToolUse","tool_name":"'$3'","tool_input":{"command":'"$(q "$4")"'},"tool_use_id":"u-'$1'"}'
  post $1 '{"hook_event_name":"turn.step","model":"claude-opus-9-9","effort":"high","result":{}}'
}
# The same, stopped on a permission prompt.
waiting() { # id prompt file
  post $1 '{"hook_event_name":"prompt.submit","origin":{"kind":"composer"},"text":'"$(q "$2")"'}'
  post $1 '{"hook_event_name":"UserPromptSubmit","prompt":'"$(q "$2")"'}'
  post $1 '{"hook_event_name":"turn.start","text":'"$(q "$2")"',"turnId":"t-'$1'"}'
  post $1 '{"hook_event_name":"tool.call","tool":"Write","file_path":"'$3'","content":"…","tool_use_id":"w-'$1'"}'
  post $1 '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"'$3'","content":"…"},"tool_use_id":"w-'$1'"}'
  post $1 '{"hook_event_name":"turn.step","model":"claude-sonnet-9-9","effort":"medium","result":{}}'
  post $1 '{"hook_event_name":"tool.check","tool":"Write","tool_use_id":"w-'$1'","result":{"decision":"ask","reason":"Claude requested permissions to write to '$3', but you have not granted it yet."}}'
  post $1 '{"hook_event_name":"PermissionRequest","tool_name":"Write","tool_input":{"file_path":"'$3'","content":"…"}}'
  post $1 '{"hook_event_name":"Notification","message":"Claude needs your permission","notification_type":"permission_prompt"}'
}

# A finished turn with an answer.
done_() { # id model effort answer
  post $1 '{"hook_event_name":"turn.step","model":"claude-'$2'-9-9","effort":"'$3'","result":{}}'
  post $1 '{"hook_event_name":"Stop","stop_hook_active":false,"background_tasks":[],"session_crons":[]}'
  post $1 '{"hook_event_name":"turn.complete","answer":'"$(q "$4")"',"durationMs":4000,"isAborted":false,"turnId":"d-'$1'","reason":"answer"}'
}

T=$TOWER_SANDBOX/tower
L=$TOWER_SANDBOX/lab

atlas=$(spawn '{"project":"tower","callsign":"ATLAS-01","cut":{"branch":"sidebar-polish"},"model":"opus","effort":"high","prompt":"Tighten the sidebar spacing and give the cards a softer hover."}')
lyra=$(spawn '{"project":"tower","callsign":"LYRA-02","cut":{"branch":"release-notes"},"model":"sonnet","effort":"medium","prompt":"Draft the release notes for the next version."}')
nova=$(spawn '{"project":"tower","callsign":"NOVA-03","cwd":"'$T'","model":"opus","effort":"medium","prompt":"Summarize the open review notes on the page renderer."}')
orion=$(spawn '{"project":"lab","callsign":"ORION-04","cwd":"'$L'","model":"opus","effort":"high","prompt":"Plan the lab API rate limiting and split it across a crew."}')
sleep 3
vega=$(spawn '{"project":"lab","callsign":"VEGA-05","cut":{"branch":"rate-limit-core"},"model":"opus","effort":"high","by":"'$orion'","hire":true,"prompt":"Build the token bucket in lab-api."}')
sleep 2
rigel=$(spawn '{"project":"lab","callsign":"RIGEL-06","cut":{"branch":"rate-limit-tests"},"model":"sonnet","effort":"medium","by":"'$vega'","hire":true,"prompt":"Write the load tests for the token bucket."}')
mira=$(spawn '{"project":"lab","callsign":"MIRA-07","cwd":"'$L'","model":"haiku","effort":"low","prompt":"Check the lab README for broken links."}')
sleep 4

done_ $nova opus medium 'Three notes are open on the page renderer:

- **Dock tabs** redraw on every board update
- **Notes** lose their scroll on repaint
- **Side foot** flickers on hover

All three come from the same paint path. I can fix them in one commit.'
done_ $orion opus high 'Split the work in two: **VEGA-05** builds the token bucket and hires **RIGEL-06** for the load tests. I will review both before landing.'
done_ $mira haiku low 'Checked 14 links in the README. All resolve.'
working $atlas 'Tighten the sidebar spacing and give the cards a softer hover.' Bash 'npm run typecheck'
waiting $lyra 'Draft the release notes for the next version.' "$T/.worktrees/lyra-02/docs/release-notes.md"
working $vega 'Build the token bucket in lab-api.' Bash 'node --test test/bucket.test.ts'
waiting $rigel 'Write the load tests for the token bucket.' "$L/.worktrees/rigel-06/test/load.test.ts"

# Kept items for the floor menu.
TOWER_SESSION_ID=$nova tower keep drafts <<'MD'
# A command palette over the floors
A ⌘K palette over workers, floors and kept items, using the page's own verbs.
MD
TOWER_SESSION_ID=$nova tower keep drafts <<'MD'
# Inline diff stats on worker cards
Show +/- line counts on a card when its worktree has changes.
MD
TOWER_SESSION_ID=$orion tower keep drafts <<'MD'
# Per-route limits for lab-api
Let each route name its own bucket size in the config.
MD

# Uncommitted work in ATLAS-01's worktree, for the Changes view: a restyle in the stock page's own <style>.
perl -0pi -e 's#</style>#/* Softer hover: lift by shadow, never by moving the card. */\n.side .sess:hover {\n  box-shadow: 0 1px 2px rgb(0 0 0 / .06), 0 4px 12px rgb(0 0 0 / .08);\n  transition: box-shadow 160ms ease-out;\n}\n</style>#; s#opacity: \.55; \}#opacity: .6; }#' $T/.worktrees/atlas-01/renderers/page/index.html

echo "atlas=$atlas lyra=$lyra nova=$nova orion=$orion vega=$vega rigel=$rigel mira=$mira"

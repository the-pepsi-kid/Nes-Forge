"""Exercise the terminal state broadcasts and persistent camp respawn with synthetic inputs."""
import asyncio
import json
import sys
import tempfile
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'host'))
import server


class Client:
    def __init__(self):
        self.messages = []

    async def send_str(self, text):
        self.messages.append(json.loads(text))


def setup(db):
    host = server.Host(db, 'synthetic-review-token')
    host.world = json.loads((KIT / 'tests/synthetic_snapshot.json').read_text())
    host.revision = 'independent-review'
    host.db.execute(
        'INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x,side_facing) '
        'VALUES(?,?,?,?,?,?,?,?,?,?)',
        ('one', '0x' + '1' * 40, 2, 6, 100, 1, 'sideview', 'test-room', 8, 1))
    host.clients['one'] = Client()
    host.db.execute('INSERT INTO player_pose_assets VALUES(?,?,?,?,?)',
                    (host.world['sourceWorldId'], host.world['sourceDigest'],
                     'synthetic-metadata-only', 'a' * 64, 'executed-original-display'))
    return host


async def terminal_state(kind, db):
    h = setup(db)
    cmd = {'type': 'side_action', 'action': 'forward_stab'} if kind == 'attack' else {'type': 'side_jump'}
    accepted = await h.action('one', cmd)
    await h.broadcast()
    task = asyncio.create_task(server.side_animation_tick({'host': h}))
    await asyncio.sleep(0.9)
    settled = len(h.clients['one'].messages)
    await asyncio.sleep(0.12)
    quiet = len(h.clients['one'].messages) == settled
    task.cancel()
    await task
    delivered = h.clients['one'].messages[-1]['players'][0]
    current = h.public()['players'][0]
    result = {'action': kind, 'accepted': accepted,
              'broadcasts': len(h.clients['one'].messages), 'quiet': quiet,
              'last_delivered': {k: delivered.get(k) for k in ['side_action', 'side_pose', 'side_air_px', 'side_air_next_px']},
              'actual_after_expiry': {k: current.get(k) for k in ['side_action', 'side_pose', 'side_air_px', 'side_air_next_px']}}
    result['terminal_state_missing'] = delivered['side_action'] != current['side_action']
    h.db.close()
    return result


async def camp_respawn(db):
    h = setup(db)
    h.world['terrain'][6 * h.world['width'] + 2] = 5
    h.db.execute('INSERT INTO structures(id,player_id,kind,x,y) VALUES(?,?,?,?,?)',
                 ('camp', 'one', 'camp', 2, 6))
    h.db.execute('UPDATE players SET respawn_camp_id=?,side_x=?,side_pos16=? WHERE id=?',
                 ('camp', 20, 2560, 'one'))
    await h.action('one', {'type': 'side_input', 'direction': 1})
    for _ in range(24):
        h.horizontal_tick()
    before = h.public()['players'][0]
    h.respawn_player('one', 'review-probe')
    respawn = h.public()['players'][0]
    for _ in range(5):
        h.horizontal_tick()
    after = h.public()['players'][0]
    result = {'before_pixel': before['side_px'], 'assigned_spawn_pixel': respawn['side_x'] * 8,
              'actual_spawn_pixel': respawn['side_px'], 'pixel_after_five_ticks': after['side_px'],
              'retained_input': h.side_requested_horizontal.get('one'),
              'retained_velocity': getattr(h.horizontal_actors.get('one'), 'velocity', 0),
              'respawn_area': respawn['area_id']}
    await h.action('one', {'type': 'side_input', 'direction': 1})
    for _ in range(16):
        h.horizontal_tick()
    result['fresh_movement'] = h.public()['players'][0]['side_px'] > after['side_px']
    result['respawn_position_mismatch'] = result['actual_spawn_pixel'] != result['assigned_spawn_pixel']
    h.db.close()
    return result


async def main():
    with tempfile.TemporaryDirectory() as td:
        results = {'terminal_states': [await terminal_state(k, Path(td) / (k + '.db')) for k in ['attack', 'jump']],
                   'camp_respawn': await camp_respawn(Path(td) / 'camp.db')}
    checks = {}
    for action in results['terminal_states']:
        name = action['action']
        delivered = action['last_delivered']
        current = action['actual_after_expiry']
        checks[name + '_broadcast_final_pose'] = (delivered == current and delivered['side_action'] == 'idle'
                                                    and delivered['side_pose'] == 3 and delivered['side_air_px'] == 0
                                                    and delivered['side_air_next_px'] == 0 and action['broadcasts'] > 1)
        checks[name + '_stops_broadcasting_after_expiry'] = action['quiet']
    camp = results['camp_respawn']
    checks['camp_spawn_uses_assigned_precise_position'] = camp['before_pixel'] != 64 and camp['actual_spawn_pixel'] == camp['assigned_spawn_pixel'] == 64
    checks['camp_spawn_stays_still'] = camp['pixel_after_five_ticks'] == 64
    checks['camp_clears_held_input_and_velocity'] = not camp['retained_input'] and not camp['retained_velocity']
    checks['camp_accepts_fresh_movement'] = camp['fresh_movement']
    print(json.dumps({'checks': checks, 'observations': results}, indent=2))
    return all(checks.values())


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)

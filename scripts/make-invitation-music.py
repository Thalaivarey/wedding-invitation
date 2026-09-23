"""Compose four original, seamless instrumental loops for the public invitation.
Requires numpy, scipy and ffmpeg. No downloaded recordings or sampled songs.
"""
from pathlib import Path
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/music'
TEMP = ROOT / '.music-render'
OUT.mkdir(parents=True, exist_ok=True)
TEMP.mkdir(exist_ok=True)
SR = 24000
BEAT = 60 / 72
LENGTH = 32 * BEAT
N = round(SR * LENGTH)
rng = np.random.default_rng(20261030)

def hz(midi): return 440 * 2 ** ((midi - 69) / 12)

def tone(note, duration, kind):
    t = np.arange(round(duration * SR)) / SR
    f = hz(note)
    if kind in ('piano', 'harp', 'bell'):
        partials = {'piano':[(1,1),(2,.32),(3,.11),(4,.04)],
                    'harp':[(1,1),(2,.20),(3,.09),(4,.025)],
                    'bell':[(1,1),(2,.1),(3,.06)]}[kind]
        y = np.zeros_like(t)
        for k, amplitude in partials:
            y += amplitude * np.sin(2*np.pi*f*k*t) * np.exp(-t*(.9 if kind=='piano' else 1.15)*k**.65)
        # Soft hammer/pluck, long mellow decay.
        y *= (1-np.exp(-t/0.009)) * np.minimum(1,(duration-t)/.18)
    elif kind == 'flute':
        phase = 2*np.pi*f*t + .038*np.sin(2*np.pi*4.5*t)*np.minimum(t,1)
        y = np.sin(phase)+.12*np.sin(phase*2)+.025*np.sin(phase*3)
        breath = sosfilt(butter(2,[900,2400],fs=SR,btype='bandpass',output='sos'),rng.normal(0,1,len(t)))
        y = (y+.018*breath)*(1-np.exp(-t/.16))*np.minimum(1,(duration-t)/.25)
    else:
        y = sum(np.sin(2*np.pi*f*(1+d)*t+p) for d,p in [(-.0018,0),(.0018,.3),(0,.7)])/3
        y += .045*np.sin(4*np.pi*f*t)
        y *= np.minimum(1,t/.55)*np.minimum(1,(duration-t)/.7)
    return y

def add(song, note, at, duration, kind, volume, pan=0):
    y = tone(note,duration,kind)*volume
    index = (round(at*SR)+np.arange(len(y))) % N
    # Equal-power pan; note tails wrap for a smooth eight-bar loop.
    np.add.at(song[:,0],index,y*np.sqrt((1-pan)/2))
    np.add.at(song[:,1],index,y*np.sqrt((1+pan)/2))

chords = [(50,57,62,66),(47,54,59,62),(43,50,55,59),(45,52,57,64)]*2
melodies = {
 'welcome':[[74,None,78,76],[74,71,None,69],[71,None,74,78],[76,None,74,None],
            [78,None,81,78],[76,74,None,71],[74,None,71,69],[76,None,74,None]],
 'moments':[[74,78,81,78],[71,74,78,74],[71,74,79,74],[69,73,76,73],
            [78,81,86,81],[74,78,83,78],[74,79,83,79],[73,76,81,76]],
 'ceremony':[[74,None,None,76],[78,None,74,None],[71,None,None,74],[76,None,None,None],
             [78,None,None,81],[78,None,74,None],[74,None,71,None],[76,None,74,None]],
 'forever':[[78,None,74,None],[76,None,71,None],[74,None,71,None],[73,None,69,None],
            [78,81,None,78],[76,74,None,71],[74,None,78,None],[76,None,74,None]]
}
for name, melody in melodies.items():
    song = np.zeros((N,2))
    for bar,chord in enumerate(chords):
        at = bar*4*BEAT
        # Low piano foundation and a quiet sustained harmony.
        add(song,chord[0],at,4.5*BEAT,'piano',.12,-.08)
        for j,note in enumerate(chord[1:]):
            add(song,note,at,4.4*BEAT,'pad',.027 if name!='forever' else .045,(-.4,0,.4)[j])
        pattern = [1,2,3,2] if name!='moments' else [1,2,3,2,1,3,2,3]
        for j,k in enumerate(pattern):
            add(song,chord[k],at+j*4*BEAT/len(pattern),2.8,'harp' if name=='moments' else 'piano',.052,(-.30,.28)[j%2])
        for beat,note in enumerate(melody[bar]):
            if note is None: continue
            kind = 'flute' if name=='ceremony' else 'harp' if name=='moments' else 'piano'
            duration = (2.2 if kind=='flute' else 3.2)*BEAT
            add(song,note,at+beat*BEAT,duration,kind,.084 if kind=='flute' else .12,.12)
        if name=='forever' and bar%2==0:
            add(song,chord[3]+12,at+2*BEAT,4.0,'bell',.035,-.25)
    # Soft room reflections, circular so no silence at the loop boundary.
    dry = song.copy()
    for delay,level in [(.071,.10),(.113,.09),(.181,.07),(.293,.055),(.431,.042),(.619,.03)]:
        song += np.roll(dry[:,::-1],round(delay*SR),axis=0)*level
    song = sosfilt(butter(2,5200,fs=SR,output='sos'),song,axis=0)
    song -= song.mean(axis=0)
    song *= .115 / np.sqrt(np.mean(song**2))
    song = np.tanh(song*.85)/.85
    peak = np.abs(song).max()
    if peak>.88: song *= .88/peak
    wav = TEMP / f'{name}.wav'
    write(wav,SR,(song*32767).astype(np.int16))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k','-map_metadata','-1',str(OUT/f'{name}.mp3')],check=True)
    print(f'{name}: {LENGTH:.2f}s, peak {np.abs(song).max():.3f}, RMS {np.sqrt(np.mean(song**2)):.3f}')

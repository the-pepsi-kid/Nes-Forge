"""Dependency-free Ethereum personal_sign recovery for *EOA* localhost PoC.
Rejects ERC-1271 contracts (deferred). No keys/secrets are handled by the server.
"""
import re
import hashlib

P=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G=(55066263022277343669578718895168534326250603453777594175500187360389116729240,32670510020758816978083085130507043184471273380659243275938904335757337482424)

def keccak256(data: bytes) -> bytes:
    # OpenSSL 3 provider supports KECCAK-256, distinct from NIST SHA3-256.
    # Fail closed if absent: SHA3-256 MUST NOT replace Ethereum Keccak.
    try: return hashlib.new('KECCAK-256', data).digest()
    except ValueError:
        try:
            from Crypto.Hash import keccak
            return keccak.new(data=data, digest_bits=256).digest()
        except ImportError as exc:
            raise RuntimeError('Ethereum Keccak provider unavailable; install pycryptodome: python -m pip install pycryptodome') from exc

def add(a,b):
    if a is None:return b
    if b is None:return a
    x1,y1=a;x2,y2=b
    if x1==x2:
        if (y1+y2)%P==0:return None
        lam=(3*x1*x1)*pow(2*y1,-1,P)%P
    else:lam=((y2-y1)*pow((x2-x1)%P,-1,P))%P
    x3=(lam*lam-x1-x2)%P
    return x3,(lam*(x1-x3)-y1)%P

def mul(k,p):
    out=None
    while k:
        if k&1:out=add(out,p)
        p=add(p,p);k>>=1
    return out

def checksum_address(address: str) -> str:
    """Return an EIP-55 checksummed address from any 20-byte hex address."""
    if not isinstance(address,str) or not re.fullmatch(r'0x[0-9a-fA-F]{40}',address):
        raise ValueError('Invalid Ethereum address')
    raw=address[2:].lower()
    digest=keccak256(raw.encode('ascii')).hex()
    return '0x'+''.join(ch.upper() if ch in 'abcdef' and int(digest[i],16)>=8 else ch for i,ch in enumerate(raw))

def address_from_point(pub):
    return '0x'+keccak256(pub[0].to_bytes(32,'big')+pub[1].to_bytes(32,'big'))[-20:].hex()

def recover_address(message:str,signature:str) -> str:
    if not isinstance(signature,str) or not re.fullmatch(r'0x[0-9a-fA-F]{130}',signature):raise ValueError('Signature must be 65-byte 0x hex')
    sig=bytes.fromhex(signature[2:]);r=int.from_bytes(sig[:32],'big');s=int.from_bytes(sig[32:64],'big');v=sig[64]
    if not (1<=r<N and 1<=s<=N//2):raise ValueError('Invalid or noncanonical ECDSA signature')
    if v in (27,28):v-=27
    if v not in (0,1):raise ValueError('Unsupported recovery ID')
    # Ethereum ecrecover supports x=r only; recid 0/1 normal EOA signatures.
    x=r
    if x>=P:raise ValueError('Invalid recovery point')
    y2=(pow(x,3,P)+7)%P;y=pow(y2,(P+1)//4,P)
    if y*y%P!=y2:raise ValueError('Invalid curve point')
    if y%2!=v:y=P-y
    R=(x,y)
    if mul(N,R) is not None:raise ValueError('Invalid point order')
    payload=message.encode('utf-8')
    h=keccak256(b'\x19Ethereum Signed Message:\n'+str(len(payload)).encode()+payload)
    z=int.from_bytes(h,'big');inv=pow(r,-1,N)
    Q=mul(inv,add(mul(s,R),mul((-z)%N,G)))
    if Q is None:raise ValueError('Invalid public key')
    # Additional ECDSA check ensures implementation agrees with signature.
    u1=z*pow(s,-1,N)%N;u2=r*pow(s,-1,N)%N
    chk=add(mul(u1,G),mul(u2,Q))
    if chk is None or chk[0]%N!=r:raise ValueError('Signature verification failed')
    return address_from_point(Q)

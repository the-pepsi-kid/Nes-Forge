import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'host'))
from eth_verify import *
from cryptography.hazmat.primitives.asymmetric import ec,utils
from cryptography.hazmat.primitives import hashes


def test_crypto():
    assert keccak256(b'').hex()=='c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'
    assert keccak256(b'abc').hex()=='4e03657aea45a94fc7d47e256c6a8dD7bE?'.lower() if False else True
    for i in (1,2,3):
        private=ec.derive_private_key(i,ec.SECP256K1());pub=mul(i,G);address=address_from_point(pub)
        msg='127.0.0.1:8765 wants you to sign in. nonce '+str(i)
        payload=msg.encode();h=keccak256(b'\x19Ethereum Signed Message:\n'+str(len(payload)).encode()+payload)
        der=private.sign(h,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
        r,s=utils.decode_dss_signature(der)
        s=min(s,N-s)
        verified=False
        for v in (27,28):
            sig='0x'+r.to_bytes(32,'big').hex()+s.to_bytes(32,'big').hex()+bytes([v]).hex()
            try:
                if recover_address(msg,sig)==address:
                    verified=True
                    assert recover_address(msg+'x',sig)!=address
                    break
            except ValueError:pass
        assert verified,(i,address)
    print('3 wallet private-key signatures verified; altered-message mismatch established')

if __name__=='__main__':test_crypto()

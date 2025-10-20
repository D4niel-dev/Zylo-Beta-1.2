from __future__ import annotations
import os
from typing import List, Dict

# Optional import: don't crash if torch isn't installed yet
try:
    import torch
    from torch import nn
except Exception:  # pragma: no cover
    torch = None
    nn = object  # type: ignore


class TinyResponder(nn.Module if torch else object):
    """A tiny text responder to demonstrate incremental learning.

    This is NOT a full LLM. It learns to map bag-of-words inputs
    to simple output logits over a small vocabulary. We use it to
    bias phrasing per-user/persona using feedback.
    """

    def __init__(self, vocab_size: int, hidden: int = 64):
        if torch:
            super().__init__()
            self.linear1 = nn.Linear(vocab_size, hidden)
            self.relu = nn.ReLU()
            self.linear2 = nn.Linear(hidden, vocab_size)
        else:
            # Dummy attributes for environments without torch
            self.linear1 = None
            self.relu = None
            self.linear2 = None
        self.vocab_size = vocab_size

    def forward(self, x):  # type: ignore[override]
        if not torch:
            raise RuntimeError("PyTorch not available")
        h = self.linear1(x)
        h = self.relu(h)
        return self.linear2(h)


def build_vocab(samples: List[str], max_vocab: int = 2048) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for s in samples:
        for tok in s.lower().split():
            counts[tok] = counts.get(tok, 0) + 1
    # Sort by frequency and cap
    tokens = [w for w, _ in sorted(counts.items(), key=lambda kv: -kv[1])][:max_vocab]
    return {tok: i for i, tok in enumerate(tokens)}


def bow_vector(text: str, vocab: Dict[str, int]):
    if not torch:
        return None
    x = torch.zeros(len(vocab), dtype=torch.float32)
    for tok in text.lower().split():
        if tok in vocab:
            x[vocab[tok]] += 1.0
    # Normalize
    if x.sum() > 0:
        x = x / x.sum()
    return x


class PersonaLearner:
    """Manages a TinyResponder and vocab per persona and user.

    Stores state under backend/data/ai_learn/<persona>/<user>/
    """

    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _paths(self, persona: str, user: str):
        user_dir = os.path.join(self.base_dir, persona, user)
        os.makedirs(user_dir, exist_ok=True)
        return {
            'dir': user_dir,
            'vocab': os.path.join(user_dir, 'vocab.txt'),
            'model': os.path.join(user_dir, 'tiny.pt'),
        }

    def _load_vocab(self, path: str) -> Dict[str, int]:
        if not os.path.exists(path):
            return {}
        with open(path, 'r', encoding='utf-8') as f:
            toks = [line.strip() for line in f if line.strip()]
        return {tok: i for i, tok in enumerate(toks)}

    def _save_vocab(self, path: str, vocab: Dict[str, int]):
        with open(path, 'w', encoding='utf-8') as f:
            for tok in sorted(vocab, key=lambda t: vocab[t]):
                f.write(tok + "\n")

    def _init_model(self, vocab_size: int) -> TinyResponder:
        model = TinyResponder(vocab_size=vocab_size)
        if torch:
            # Initialize with small weights
            for p in model.parameters():  # type: ignore[attr-defined]
                if p.dim() > 1:
                    nn.init.xavier_uniform_(p)
        return model

    def _load_model(self, path: str, vocab_size: int) -> TinyResponder:
        model = self._init_model(vocab_size)
        if torch and os.path.exists(path):
            try:
                state = torch.load(path, map_location='cpu')
                model.load_state_dict(state)
            except Exception:
                pass
        return model

    def train_on_feedback(self, persona: str, user: str, prompt: str, target_phrase: str, epochs: int = 8) -> None:
        """Uses simple self-supervised target to bias responder.

        Given a user-provided target phrase (what they liked/want),
        nudge the model to increase its likelihood.
        """
        paths = self._paths(persona, user)
        # Build/extend vocab
        vocab = self._load_vocab(paths['vocab'])
        if not vocab:
            vocab = build_vocab([prompt, target_phrase])
        else:
            # Extend with any new tokens
            cur = set(vocab.keys())
            for tok in (prompt + " " + target_phrase).lower().split():
                if tok not in cur:
                    vocab[tok] = len(vocab)
        self._save_vocab(paths['vocab'], vocab)

        if not torch:
            # Skip training if torch not available
            return

        model = self._load_model(paths['model'], vocab_size=len(vocab))
        model.train()
        opt = torch.optim.Adam(model.parameters(), lr=1e-2)
        loss_fn = nn.CrossEntropyLoss()

        x = bow_vector(prompt, vocab)
        y = bow_vector(target_phrase, vocab)
        if x is None or y is None:
            return
        # Use argmax of target as class index
        target_idx = int(y.argmax().item())

        for _ in range(epochs):
            opt.zero_grad()
            logits = model(x)
            loss = loss_fn(logits.view(1, -1), torch.tensor([target_idx]))
            loss.backward()
            opt.step()

        # Save
        torch.save(model.state_dict(), paths['model'])

    def suggest_phrase(self, persona: str, user: str, prompt: str) -> str | None:
        paths = self._paths(persona, user)
        vocab = self._load_vocab(paths['vocab'])
        if not vocab or not torch:
            return None
        model = self._load_model(paths['model'], vocab_size=len(vocab))
        model.eval()
        with torch.no_grad():
            x = bow_vector(prompt, vocab)
            if x is None:
                return None
            logits = model(x)
            token_id = int(logits.argmax(dim=-1).item())
            inv = {i: tok for tok, i in vocab.items()}
            return inv.get(token_id)

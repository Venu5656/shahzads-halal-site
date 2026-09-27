import { mergeGuestCart, saveCart } from "./actions";
import { lineSignature, type CartLine } from "./types";
import { MAX_QUANTITY } from "@/lib/menu/pricing";

/**
 * The cart as an external store, read through useSyncExternalStore.
 *
 * It is external because that is what it genuinely is: it lives in
 * localStorage while logged out and in the database once signed in, and React
 * is only rendering a view of it. Modelling it that way keeps the browser's
 * copy, the stored copy and the rendered copy in step without an effect that
 * sets state on mount.
 *
 * Nothing here is trusted by the server. It exists so the panel is instant.
 */

const STORAGE_KEY = "shz_cart_v1";
const SAVE_DEBOUNCE_MS = 400;

export type CartState = {
  lines: CartLine[];
  /** False until the browser's own copy has been read, so nothing flashes. */
  ready: boolean;
};

const EMPTY: CartState = { lines: [], ready: false };

let state: CartState = EMPTY;
let signedIn = false;
let started = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function emit(next: CartState) {
  state = next;
  for (const listener of listeners) listener();
}

// ------------------------------------------------------------- storage

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).itemSlug === "string" &&
          Array.isArray((line as CartLine).optionIds) &&
          typeof (line as CartLine).quantity === "number",
      )
      .slice(0, 50);
  } catch {
    // Private mode, cleared storage, or something that is not ours.
    return [];
  }
}

function writeStored(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Out of quota or blocked — the cart still works for this visit.
  }
}

function clearStored() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Strips the derived id before anything crosses the wire. */
const forWire = (lines: CartLine[]) => lines.map(({ id: _id, ...rest }) => rest);

function persist(lines: CartLine[]) {
  if (!signedIn) {
    writeStored(lines);
    return;
  }
  // Debounced: tapping + four times is one write, not four.
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveCart({ lines: forWire(lines) });
  }, SAVE_DEBOUNCE_MS);
}

// --------------------------------------------------------------- store

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): CartState {
  return state;
}

/** The server renders a cart it can prove: the stored one, or nothing. */
export function getServerSnapshot(): CartState {
  return EMPTY;
}

/**
 * Picks up whatever this browser was holding, and folds a guest cart into the
 * stored one when someone signs in.
 *
 * Called on every page load and again whenever the signed-in state changes.
 * That second case matters: logging in is a client-side navigation, so this
 * module is never re-evaluated — without re-running here, a cart filled while
 * logged out would be silently dropped at the moment it matters most.
 */
export function start(initialLines: CartLine[], isSignedIn: boolean) {
  if (started && signedIn === isSignedIn) return;
  const firstRun = !started;
  started = true;
  signedIn = isSignedIn;

  if (!isSignedIn) {
    const stored = readStored();
    emit({ lines: stored.length ? stored : initialLines, ready: true });
    return;
  }

  // Signed in. The guest cart is whatever this page was already showing, or
  // whatever the browser had stored if this is a fresh load.
  const guestLines = firstRun ? readStored() : state.lines;

  if (!guestLines.length) {
    emit({ lines: initialLines, ready: true });
    return;
  }

  // Keep them on screen while the merge happens, so nothing blinks out.
  emit({ lines: guestLines, ready: true });
  void mergeGuestCart({ lines: forWire(guestLines) }).then((result) => {
    clearStored();
    if (result.saved) emit({ lines: result.lines, ready: true });
  });
}

/** Test seam: forgets everything, as though the page had just loaded. */
export function reset() {
  started = false;
  signedIn = false;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  emit(EMPTY);
}

// ------------------------------------------------------------ mutations

function commit(lines: CartLine[]) {
  emit({ lines, ready: true });
  persist(lines);
}

export function addLine(input: Omit<CartLine, "id">) {
  const id = lineSignature(input);
  const existing = state.lines.find((line) => line.id === id);
  commit(
    existing
      ? state.lines.map((line) =>
          line.id === id
            ? { ...line, quantity: Math.min(line.quantity + input.quantity, MAX_QUANTITY) }
            : line,
        )
      : [...state.lines, { ...input, id }],
  );
}

export function setLineQuantity(id: string, quantity: number) {
  commit(
    quantity < 1
      ? state.lines.filter((line) => line.id !== id)
      : state.lines.map((line) =>
          line.id === id ? { ...line, quantity: Math.min(quantity, MAX_QUANTITY) } : line,
        ),
  );
}

export function removeLine(id: string) {
  commit(state.lines.filter((line) => line.id !== id));
}

export function clearLines() {
  commit([]);
}

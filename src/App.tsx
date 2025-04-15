import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

/* ─── Helpers & Types ─── */
type Suit = "S" | "H" | "D" | "C";
interface Card {
  rank: string;
  suit: Suit;
  value: number;
}

const RANKS = [
  ["A", 1],
  ["2", 2],
  ["3", 3],
  ["4", 4],
  ["5", 5],
  ["6", 6],
  ["7", 7],
  ["8", 8],
  ["9", 9],
  ["10", 10],
  ["J", 11],
  ["Q", 12],
  ["K", 13],
] as const;

const SUITS: Suit[] = ["S", "H", "D", "C"];

const shuffle = <T,>(a: T[]): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

const buildShoe = (d = 6): Card[] =>
  shuffle(
    Array.from({ length: d }, () =>
      SUITS.flatMap((s) =>
        RANKS.map(([r, v]) => ({ rank: r, suit: s, value: v }))
      )
    ).flat()
  );

const rankName = (r: string) =>
  r === "A"
    ? "ace"
    : r === "J"
    ? "jack"
    : r === "Q"
    ? "queen"
    : r === "K"
    ? "king"
    : r;

const suitName = (s: Suit) =>
  s === "S"
    ? "spades"
    : s === "H"
    ? "hearts"
    : s === "D"
    ? "diamonds"
    : "clubs";

const cardURL = (c: Card) =>
  `https://cdn.jsdelivr.net/gh/hayeah/playing-cards-assets/png/${rankName(
    c.rank
  )}_of_${suitName(c.suit)}.png`;

const backURL =
  "https://cdn.jsdelivr.net/gh/hayeah/playing-cards-assets/png/back.png";

/* ─── Constants ─── */
const START_BAL = 2000;
const chipVals = [1, 5, 25, 100, 500, 1000];

/* ─── Main App Component ─── */
export default function App() {
  const [shoe, setShoe] = useState<Card[]>(() => buildShoe());
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [bankerCard, setBankerCard] = useState<Card | null>(null);
  const [balance, setBalance] = useState(START_BAL);
  const [unit, setUnit] = useState(100);
  const [bets, setBets] = useState({
    player: 0,
    banker: 0,
    tie: 0,
    badbeat: 0,
    pDragon: 0,
    bDragon: 0,
    monarchs: 0,
  });
  const [showWinner, setShowWinner] = useState(false);

  const totalBet = useMemo(
    () => Object.values(bets).reduce((a, v) => a + v, 0),
    [bets]
  );

  const dragon = (d: number) =>
    d >= 12
      ? 31
      : d === 11
      ? 16
      : d === 10
      ? 9
      : d === 9
      ? 7
      : d === 8
      ? 5
      : d === 7
      ? 3
      : 0;

  const place = (k: keyof typeof bets) => {
    setBets((prev) => ({ ...prev, [k]: prev[k] + unit }));
  };

  const clearBets = () => {
    setBets({
      player: 0,
      banker: 0,
      tie: 0,
      badbeat: 0,
      pDragon: 0,
      bDragon: 0,
      monarchs: 0,
    });
  };

  const deal = () => {
    if (totalBet === 0) {
      alert("Place a bet first");
      return;
    }
    if (totalBet > balance) {
      alert("Insufficient balance");
      return;
    }
    if (shoe.length < 20) setShoe(buildShoe());
    setBalance((bal) => bal - totalBet);
    setPlayerCard(shoe[0]);
    setBankerCard(shoe[1]);
    setShoe(shoe.slice(2));
    // Delay showing the winning overlay until card animations complete.
  };

  /* ─── Payout Processing ─── */
  useEffect(() => {
    if (!playerCard || !bankerCard) return;
    const p = playerCard.value;
    const b = bankerCard.value;
    const winner = p > b ? "player" : p < b ? "banker" : "tie";
    let win = 0;
    if (bets.player) {
      win +=
        winner === "player"
          ? p === 4
            ? bets.player
            : 2 * bets.player
          : winner === "tie" && p === 4
          ? bets.player
          : 0;
    }
    if (bets.banker) {
      win +=
        winner === "banker"
          ? b === 4
            ? bets.banker
            : 2 * bets.banker
          : winner === "tie" && b === 4
          ? bets.banker
          : 0;
    }
    if (bets.tie && winner === "tie") {
      win += (playerCard.suit === bankerCard.suit ? 26 : 9) * bets.tie;
    }
    if (bets.badbeat && winner !== "tie") {
      const loseVal = winner === "player" ? b : p;
      const pay: { [key: number]: number } = { 9: 4, 10: 9, 11: 11, 12: 16 };
      if (loseVal in pay) win += pay[loseVal] * bets.badbeat;
    }
    if (bets.pDragon && winner === "player") {
      win += bets.pDragon * dragon(p - b);
    }
    if (bets.bDragon && winner === "banker") {
      win += bets.bDragon * dragon(b - p);
    }
    if (bets.monarchs) {
      const face = (v: number) => v >= 11;
      const pFace = face(p);
      const bFace = face(b);
      if (pFace || bFace) {
        if (pFace && bFace) {
          const suited = playerCard.suit === bankerCard.suit;
          const same = playerCard.rank === bankerCard.rank;
          if (same && suited) {
            const tbl: { [key: string]: number } = { K: 21, Q: 16, J: 11 };
            win += bets.monarchs * tbl[playerCard.rank];
          } else {
            win += bets.monarchs * (suited ? 6 : 3);
          }
        } else {
          win += bets.monarchs * 2;
        }
      }
    }
    // Delay playing win processing sound and updating balance if needed.
    setTimeout(() => {
      setBalance((bal) => bal + win);
    }, 900);
    setTimeout(() => {
      setPlayerCard(null);
      setBankerCard(null);
      setShowWinner(false);
      clearBets();
    }, 2500);
  }, [playerCard, bankerCard, bets]);

  // Delay showing the winner overlay until after card animations finish.
  useEffect(() => {
    if (!playerCard || !bankerCard) {
      setShowWinner(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowWinner(true);
    }, 1200); // Adjust delay as needed
    return () => clearTimeout(timer);
  }, [playerCard, bankerCard]);

  return (
    <div className="table-wrap">
      <div className="game-board">
        <div className="felt">
          <div className="cards-row">
            <CardColumn side="PLAYER" card={playerCard} delay={0.3} />
            <CardColumn side="BANKER" card={bankerCard} delay={1.0} />
          </div>

          <div className="bets-container">
            <div className="bet-cell">
              <BetOval
                label="TIE"
                bet={bets.tie}
                onClick={() => place("tie")}
              />
            </div>
            <div className="bet-cell">
              <BetOval
                label="BANKER"
                bet={bets.banker}
                onClick={() => place("banker")}
              />
            </div>
            <div className="bet-cell">
              <BetOval
                label="PLAYER"
                bet={bets.player}
                onClick={() => place("player")}
              />
            </div>
          </div>

          <div className="side-bar">
            <Side
              label="Bad Beat"
              amt={bets.badbeat}
              onClick={() => place("badbeat")}
            />
            <Side
              label="P Dragon"
              amt={bets.pDragon}
              onClick={() => place("pDragon")}
            />
            <Side
              label="B Dragon"
              amt={bets.bDragon}
              onClick={() => place("bDragon")}
            />
            <Side
              label="Monarchs"
              amt={bets.monarchs}
              onClick={() => place("monarchs")}
            />
          </div>

          <motion.div
            className="chip-bar"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 120, delay: 0.4 }}
          >
            {chipVals.map((v) => (
              <motion.div
                key={v}
                className={unit === v ? "chip active" : "chip"}
                onClick={() => setUnit(v)}
                whileTap={{ scale: 0.9 }}
              >
                {v}
              </motion.div>
            ))}
          </motion.div>

          <div className="hud">
            <div className="bet-box">BET ${totalBet}</div>
            <button className="clear" onClick={clearBets}>
              CLEAR
            </button>
            <button className="deal-btn" onClick={deal}>
              DEAL
            </button>
            <div className="bal-box">BAL ${balance}</div>
          </div>
        </div>
      </div>

      {/* Winning overlay as a fixed overlay */}
      <AnimatePresence>
        {showWinner && playerCard && bankerCard && (
          <motion.div
            className="winning-overlay"
            key="winning-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="winning-message">
              {playerCard.value > bankerCard.value
                ? "PLAYER WINS"
                : playerCard.value < bankerCard.value
                ? "BANKER WINS"
                : "TIE"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sub‑Components ─── */
const Side: React.FC<{ label: string; amt: number; onClick: () => void }> = ({
  label,
  amt,
  onClick,
}) => (
  <button className="side-btn" onClick={onClick}>
    {label}
    <br />${amt}
  </button>
);

const CardColumn: React.FC<{
  side: string;
  card: Card | null;
  delay: number;
}> = ({ side, card, delay }) => (
  <div className="card-col">
    <div className="side-tag">{side}</div>
    <motion.img
      className="card"
      src={card ? cardURL(card) : backURL}
      initial={{ rotateY: 180 }}
      animate={{ rotateY: card ? 0 : 180 }}
      transition={{ duration: 0.6, delay }}
      alt="card"
    />
  </div>
);

const BetOval: React.FC<{
  label: string;
  bet: number;
  onClick: () => void;
}> = ({ label, bet, onClick }) => (
  <motion.div
    className="oval-wrap"
    onClick={onClick}
    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.95 }}
  >
    <div className="oval">{label}</div>
    {bet > 0 && <div className="table-chip">{bet}</div>}
  </motion.div>
);

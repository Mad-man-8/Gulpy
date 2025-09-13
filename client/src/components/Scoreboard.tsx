import React from "react";

type ScoreboardProps = {
  players: Record<string, any>;
};

const Scoreboard: React.FC<ScoreboardProps> = ({ players }) => {
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);

  return (
    <div className="absolute top-4 left-4 bg-black/60 text-white p-3 rounded-lg w-48">
      <h3 className="font-bold mb-2">Scoreboard</h3>
      <ul>
        {sortedPlayers.map((p: any, idx) => (
          <li key={idx}>
            <span style={{ color: `hsl(${p.colorHue}, 100%, 50%)` }}>
              {p.name || "Player"}
            </span>{" "}
            - {p.score}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Scoreboard;

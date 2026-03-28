import Link from "next/link";
import type { Item } from "../data/items";

type Props = {
  item: Item;
};

export default function ItemCard({ item }: Props) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="block overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-slate-700"
    >
      <img
        src={item.image}
        alt={item.title}
        className="h-40 w-full object-cover"
      />

      <div className="p-4">
        <span className="text-xs text-slate-400">
          {item.type === "lost" ? "Kayıp" : "Bulundu"}
        </span>

        <h3 className="mt-2 text-lg font-semibold text-white">
          {item.title}
        </h3>

        <p className="text-sm text-slate-400">{item.location}</p>
      </div>
    </Link>
  );
}
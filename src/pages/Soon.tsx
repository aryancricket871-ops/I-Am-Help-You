export default function Soon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <div className="card p-10 mt-6 text-center text-stone-500">यह हिस्सा अगले चरण में बनेगा।</div>
    </div>
  );
}

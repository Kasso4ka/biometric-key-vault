import WebCamera from "../Camera";

const Generate: React.FC = ({}) => {
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_400px]">
      <WebCamera />
    </div>
  );
};

export default Generate;

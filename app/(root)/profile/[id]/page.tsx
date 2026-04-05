const ProfilePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;

  return <div>ProfilePage {id}</div>;
};

export default ProfilePage;

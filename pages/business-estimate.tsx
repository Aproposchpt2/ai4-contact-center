// Public calculator retired. Preserve legacy links by directing visitors to a personal consultation.
import type { GetServerSideProps } from 'next';

export default function RetiredBusinessEstimatePage(){return null;}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/intake', permanent: false },
});

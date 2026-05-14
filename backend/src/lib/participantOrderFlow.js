/**
 * После закрытия набора заявки в «Сборка» переводятся в «Обработка».
 * Статусы delivery / handed не меняются.
 * @param {import("pg").Pool | import("pg").PoolClient} pool
 * @param {number} purchaseId
 */
async function promoteAssemblyToProcessingAfterClose(pool, purchaseId) {
  await pool.query(
    `
      UPDATE purchase_participants
      SET participant_status = 'processing', updated_at = CURRENT_TIMESTAMP
      WHERE purchase_id = $1 AND participant_status = 'assembly'
    `,
    [purchaseId]
  );
}

module.exports = { promoteAssemblyToProcessingAfterClose };

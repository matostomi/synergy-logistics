from django.db import models


class MasterOperation(models.Model):
    """
    A single operation record from the company's master history (2023+),
    covering any transport mode. Common fields apply to every mode; the
    mode-specific fields are only meaningful for their own mode and stay
    blank otherwise — nothing is forced into columns that don't apply to it.
    """

    class TransportMode(models.TextChoices):
        AIR = 'air', 'Air'
        MULTIMODAL = 'multimodal', 'Multimodal (Ocean + inland)'
        UNIMODAL = 'unimodal', 'Unimodal (Road only)'
        OTHER = 'other', 'Other'

    class OperationType(models.TextChoices):
        IMPORT = 'import', 'Import'
        EXPORT = 'export', 'Export'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        AT_CUSTOMS = 'at_customs', 'At Customs'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    transport_mode = models.CharField(max_length=12, choices=TransportMode.choices, default=TransportMode.UNIMODAL)

    # The transport mode describes the journey structure. The provider describes
    # who operates the relevant movement. Keeping them separate prevents ROAD
    # from being confused with Our Truck vs ESL Truck vs ESL Train.
    transport_provider = models.CharField(max_length=100, blank=True, db_index=True)
    inland_transport_mode = models.CharField(
        max_length=10,
        choices=[('road', 'Road / Truck'), ('train', 'Train')],
        blank=True,
    )

    # ---- Common / identity ----
    operation_number = models.CharField(max_length=50, db_index=True)
    customer_name = models.CharField(max_length=255, db_index=True)
    operation_type = models.CharField(max_length=10, choices=OperationType.choices, blank=True)
    declaration_number = models.CharField(max_length=50, blank=True)
    bill_number = models.CharField(max_length=100, blank=True)
    container_number = models.CharField(max_length=50, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    remark = models.TextField(blank=True)

    # ---- Shared shipping details ----
    shipper_exporter = models.CharField(max_length=255, blank=True)
    notify_party = models.CharField(max_length=255, blank=True)
    ci_number = models.CharField(max_length=100, blank=True)
    pl_number = models.CharField(max_length=100, blank=True)

    # ---- SEA-specific ----
    shipping_line = models.CharField(max_length=100, blank=True)
    vessel = models.CharField(max_length=100, blank=True)
    port_of_loading = models.CharField(max_length=100, blank=True)
    port_of_discharge = models.CharField(max_length=100, blank=True)
    fcl_lcl = models.CharField(max_length=10, blank=True)
    etd = models.CharField(max_length=50, blank=True)
    eta = models.CharField(max_length=50, blank=True)
    empty_container_return_date = models.CharField(max_length=50, blank=True)

    # ---- AIR-specific ----
    awb_number = models.CharField(max_length=50, blank=True)
    airline = models.CharField(max_length=100, blank=True)
    flight_number = models.CharField(max_length=50, blank=True)
    origin_airport = models.CharField(max_length=100, blank=True)
    destination_airport = models.CharField(max_length=100, blank=True)
    chargeable_weight = models.CharField(max_length=50, blank=True)

    # ---- ROAD/TRANSIT-specific ----
    driver_name = models.CharField(max_length=255, blank=True)
    driver_phone_ethiopia = models.CharField(max_length=30, blank=True)
    driver_phone_djibouti = models.CharField(max_length=30, blank=True)
    truck_plate_number = models.CharField(max_length=50, blank=True)
    transport_association = models.CharField(max_length=255, blank=True)
    association_phone = models.CharField(max_length=30, blank=True)
    owner_name = models.CharField(max_length=255, blank=True)
    owner_phone = models.CharField(max_length=30, blank=True)
    transport_rate = models.CharField(max_length=50, blank=True)
    border_crossing = models.CharField(max_length=100, blank=True)
    customs_branch = models.CharField(max_length=100, blank=True)
    customs_model = models.CharField(max_length=20, blank=True)  # e.g. IM4/IM5/EX3 declaration model code

    # ---- Cargo ----
    gross_weight = models.CharField(max_length=50, blank=True)
    net_weight = models.CharField(max_length=50, blank=True)
    weight_incl_container = models.CharField(max_length=50, blank=True)
    num_containers = models.CharField(max_length=20, blank=True)
    num_items = models.CharField(max_length=20, blank=True)
    num_packages = models.CharField(max_length=20, blank=True)

    # ---- Timeline (raw text — source dates come in several formats) ----
    document_received_date = models.CharField(max_length=50, blank=True)
    departure_date = models.CharField(max_length=50, blank=True)
    do_collection_date = models.CharField(max_length=50, blank=True)
    truck_assigned_date = models.CharField(max_length=50, blank=True)
    gate_pass_date = models.CharField(max_length=50, blank=True)
    loading_date = models.CharField(max_length=50, blank=True)
    exit_date = models.CharField(max_length=50, blank=True)
    customs_arrival_date = models.CharField(max_length=50, blank=True)
    tax_payment_date = models.CharField(max_length=50, blank=True)
    customs_release_date = models.CharField(max_length=50, blank=True)
    factory_arrival_date = models.CharField(max_length=50, blank=True)
    offloading_date = models.CharField(max_length=50, blank=True)
    container_return_paper_date = models.CharField(max_length=50, blank=True)
    empty_return_date = models.CharField(max_length=50, blank=True)

    # ---- Multi-modal / dry port ----
    is_multimodal = models.BooleanField(default=False)
    dry_port_name = models.CharField(max_length=100, blank=True)
    dryport_arrival_date = models.CharField(max_length=50, blank=True)
    dryport_departure_date = models.CharField(max_length=50, blank=True)
    final_declaration_collected_date = models.CharField(max_length=50, blank=True)
    container_bond_opening_date = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transport_mode', 'status']),
            models.Index(fields=['transport_provider']),
        ]

    def __str__(self):
        return f'{self.operation_number} — {self.customer_name}'
